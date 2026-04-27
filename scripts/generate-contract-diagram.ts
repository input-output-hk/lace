/* eslint-disable max-params, no-console, @typescript-eslint/no-require-imports  */
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

import type {
  Contract,
  ContractName,
  Contracts,
  LaceModule,
  LaceModuleAddonNames,
  LaceModuleMap,
} from '@lace-contract/module';

interface ContractInfo {
  contractName: ContractName;
  instance: string;
  dependsOn?: ContractName[];
  providesAddons?: string[];
  packageName: string;
}

interface ModuleInfo {
  apps: string[];
  implements: ContractName[];
  dependsOn?: ContractName[];
  packageName: string;
}

// Helper to safely get contract names from dependsOn
const extractContractNames = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  maybeContracts?: Contracts<any, any, any>,
): ContractName[] => {
  if (!maybeContracts?.contracts) return [];
  return maybeContracts.contracts.map(contract => contract.name);
};

// Helper to extract addon names
const extractAddonNames = (
  provides: Contract['provides'],
): LaceModuleAddonNames => {
  if (!provides?.addons) return [];
  return Array.isArray(provides.addons) ? provides.addons : [];
};

// String formatting utilities
const capitalizeFirst = (string_: string): string =>
  string_.charAt(0).toUpperCase() + string_.slice(1);

const kebabToTitle = (kebabString: string): string =>
  kebabString
    .split('-')
    .map(part => capitalizeFirst(part))
    .join(' ');

const sanitizeForMermaid = (name: string): string => name.replace(/\./g, '_');

// Generate contract label with addons for Mermaid diagrams
const generateContractLabel = (
  name: ContractName,
  info: ContractInfo,
): string => {
  let label = name.replace(/\./g, '<br/>');

  if (info.providesAddons && info.providesAddons.length > 0) {
    label += '<br/>---';
    for (const addon of info.providesAddons) {
      label += `<br/><i>${addon}</i>`;
    }
  }

  return label;
};

// Generate unique name with suffix pattern
const ensureUniqueName = <T>(
  baseName: string,
  existingNames: Map<string, T> | Set<string>,
): string => {
  let finalName = baseName;
  let suffix = 1;

  const has = (name: string) =>
    existingNames instanceof Map
      ? existingNames.has(name)
      : existingNames.has(name);

  while (has(finalName)) {
    finalName = `${baseName} (${suffix})`;
    suffix++;
  }

  return finalName;
};

const isContractObject = (value: unknown): value is Contract =>
  !!value &&
  typeof value === 'object' &&
  'name' in value &&
  'instance' in value;

// Discover all contracts from packages/contract/*
const discoverContracts = (): Map<ContractName, ContractInfo> => {
  const contracts = new Map<ContractName, ContractInfo>();
  const contractsDirectory = path.join(__dirname, '../packages/contract');

  const packageNames = fs.readdirSync(contractsDirectory);
  for (const packageName of packageNames) {
    try {
      // Try to require the package
      const packagePath = path.join(contractsDirectory, packageName);
      const contractExports = require(packagePath) as Record<string, unknown>;

      // Find all exports that look like contracts (have 'name' and 'instance' properties)
      for (const maybeContract of Object.values(contractExports)) {
        if (isContractObject(maybeContract)) {
          const contractName = maybeContract.name;

          contracts.set(contractName, {
            contractName,
            instance: maybeContract.instance,
            dependsOn: extractContractNames(maybeContract.dependsOn),
            providesAddons: extractAddonNames(maybeContract.provides),
            packageName,
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to load contract package ${packageName}:`, error);
    }
  }

  return contracts;
};

interface DiscoverModulesResult {
  modules: ModuleInfo[];
  orphanDirectories: string[];
}

// Discover all modules from packages/module/*
const discoverModules = (): DiscoverModulesResult => {
  const modules: ModuleInfo[] = [];
  const orphanDirectories: string[] = [];
  const modulesDirectory = path.join(__dirname, '../packages/module');

  const packageNames = fs.readdirSync(modulesDirectory);
  for (const packageName of packageNames) {
    // Ignore hidden folders like .DS_Store on osx
    if (packageName.startsWith('.')) continue;

    const packagePath = path.join(modulesDirectory, packageName);

    // Check if directory is empty (orphan directory from a removed module)
    const contents = fs.readdirSync(packagePath);
    if (contents.length === 0) {
      console.warn(`Skipping orphan module directory: ${packageName}`);
      orphanDirectories.push(packagePath);
      continue;
    }

    try {
      // Try to require the package
      const moduleExports = require(packagePath) as Record<string, unknown>;

      const moduleMap = moduleExports.default as LaceModuleMap;

      if (moduleMap && typeof moduleMap === 'object') {
        // Get any app's module to extract info
        const apps = Object.keys(moduleMap);
        const anyAppModule = Object.values(moduleMap)[0] as LaceModule;

        if (anyAppModule) {
          modules.push({
            apps,
            implements: extractContractNames(anyAppModule.implements),
            dependsOn: extractContractNames(anyAppModule.dependsOn),
            packageName,
          });
        } else {
          console.warn('Module not found in package', packageName);
        }
      }
    } catch (error) {
      console.error(`Failed to load module package ${packageName}:`, error);
      process.exit(1);
    }
  }

  return { modules, orphanDirectories };
};

// Helper to build adjacency lists for the dependency graph
const buildContractDependencyGraph = (
  contracts: Map<ContractName, ContractInfo>,
): Map<ContractName, Set<ContractName>> => {
  const graph = new Map<ContractName, Set<ContractName>>();
  const reverseGraph = new Map<ContractName, Set<ContractName>>();

  // Initialize graph nodes
  for (const [name] of contracts) {
    graph.set(name, new Set());
    reverseGraph.set(name, new Set());
  }

  // Build adjacency lists
  for (const [name, info] of contracts) {
    if (info.dependsOn) {
      for (const dep of info.dependsOn) {
        graph.get(name)?.add(dep);
        reverseGraph.get(dep)?.add(name);
      }
    }
  }

  // Create bidirectional graph for clustering
  const bidirectionalGraph = new Map<ContractName, Set<ContractName>>();
  for (const [name] of contracts) {
    const connections = new Set<ContractName>();
    // Add dependencies
    const deps = graph.get(name);
    if (deps) {
      for (const dep of deps) {
        connections.add(dep);
      }
    }
    // Add dependents
    const dependents = reverseGraph.get(name);
    if (dependents) {
      for (const dependent of dependents) {
        connections.add(dependent);
      }
    }
    bidirectionalGraph.set(name, connections);
  }

  return bidirectionalGraph;
};

// Generic depth-first search function for graph traversal
const dfs = <T>(
  startNode: T,
  graph: Map<T, Set<T>>,
  visited: Set<T>,
  component: Set<T> | T[],
) => {
  visited.add(startNode);
  if (Array.isArray(component)) {
    component.push(startNode);
  } else {
    component.add(startNode);
  }

  const neighbors = graph.get(startNode);
  if (neighbors) {
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, graph, visited, component);
      }
    }
  }
};

// Find connected components in any graph
const findConnectedComponents = <T>(graph: Map<T, Set<T>>): Set<T>[] => {
  const visited = new Set<T>();
  const components: Set<T>[] = [];

  for (const [node] of graph) {
    if (!visited.has(node)) {
      const component = new Set<T>();
      dfs(node, graph, visited, component);
      components.push(component);
    }
  }

  return components;
};

// Helper to find strongly connected components (contracts that depend on each other)
const findContractClusters = (
  contracts: Map<ContractName, ContractInfo>,
): Map<string, Set<ContractName>> => {
  const clusters = new Map<string, Set<ContractName>>();

  // Build the dependency graph
  const graph = buildContractDependencyGraph(contracts);

  // Find connected components
  const components = findConnectedComponents(graph);

  // Sort components by size for consistent naming
  components.sort((a, b) => b.size - a.size);

  // Process each component
  components.forEach((component, index) => {
    if (component.size === 1) {
      // Single isolated contracts - check if truly isolated
      const contract = Array.from(component)[0];
      const info = contracts.get(contract)!;
      const hasNoDeps = !info.dependsOn || info.dependsOn.length === 0;

      // Check if any other contract depends on this one
      let hasNoDependents = true;
      for (const [, otherInfo] of contracts) {
        if (otherInfo.dependsOn?.includes(contract)) {
          hasNoDependents = false;
          break;
        }
      }

      // Only add to isolated if truly isolated
      if (hasNoDeps && hasNoDependents) {
        if (!clusters.has('isolated')) {
          clusters.set('isolated', new Set());
        }
        clusters.get('isolated')!.add(contract);
      } else {
        // This shouldn't happen with proper graph building, but handle it
        clusters.set(`single-${contract}`, component);
      }
    } else {
      // Try to find a meaningful name for the cluster
      let clusterName = '';

      // Find the most connected node (hub) in the component
      let maxConnections = 0;
      let hubContract = '';
      for (const contract of component) {
        const connections = graph.get(contract)?.size || 0;
        if (connections > maxConnections) {
          maxConnections = connections;
          hubContract = contract;
        }
      }

      // Use the hub contract's name as cluster name, or a generic name
      if (hubContract) {
        // Extract meaningful part from hub contract name
        const parts = hubContract.split('-');
        clusterName = parts[0];

        // Ensure unique cluster name
        clusterName = ensureUniqueName(clusterName, clusters).replace(
          / \(\d+\)$/,
          match => match.replace(/[()]/g, '').replace(' ', '-'),
        );
      } else {
        clusterName = `cluster-${index + 1}`;
      }

      clusters.set(clusterName, component);
    }
  });

  // Split large isolated group into logical subgroups based on name patterns
  const isolated = clusters.get('isolated');
  if (isolated && isolated.size > 10) {
    clusters.delete('isolated');

    // Group by common prefixes
    const prefixGroups = new Map<string, Set<ContractName>>();
    for (const contract of isolated) {
      const prefix = contract.split('-')[0];
      if (!prefixGroups.has(prefix)) {
        prefixGroups.set(prefix, new Set());
      }
      prefixGroups.get(prefix)!.add(contract);
    }

    // Create clusters from prefix groups
    for (const [prefix, contractSet] of prefixGroups) {
      if (contractSet.size >= 2) {
        clusters.set(`${prefix}-standalone`, contractSet);
      } else {
        // Add single contracts to misc group
        if (!clusters.has('misc')) {
          clusters.set('misc', new Set());
        }
        for (const contract of contractSet) {
          clusters.get('misc')!.add(contract);
        }
      }
    }
  }

  return clusters;
};

// Generate a Mermaid diagram for contract dependencies
const generateContractDependencyDiagram = (
  contracts: Map<ContractName, ContractInfo>,
  contractNames: Set<ContractName>,
  title: string,
): string => {
  const lines: string[] = [];
  lines.push(`### ${title}`);
  lines.push('');
  lines.push('```mermaid');
  lines.push('graph TD');

  // Add nodes with better styling
  for (const name of contractNames) {
    const info = contracts.get(name)!;
    const label = generateContractLabel(name, info);
    lines.push(`  ${sanitizeForMermaid(name)}["${label}"]`);
  }

  // Add edges (dependent -> dependency)
  for (const name of contractNames) {
    const info = contracts.get(name)!;
    if (info.dependsOn) {
      for (const dep of info.dependsOn) {
        if (contractNames.has(dep)) {
          lines.push(
            `  ${sanitizeForMermaid(name)} --> ${sanitizeForMermaid(dep)}`,
          );
        }
      }
    }
  }

  lines.push('```');
  lines.push('');

  return lines.join('\n');
};

// Helper to cluster modules by their implementation patterns using graph analysis
const clusterModulesByImplementation = (
  modules: ModuleInfo[],
): Map<string, { modules: ModuleInfo[]; contracts: Set<ContractName> }> => {
  const moduleClusters = new Map<
    string,
    { modules: ModuleInfo[]; contracts: Set<ContractName> }
  >();

  // Calculate Jaccard similarity between modules based on contracts they implement
  const calculateJaccardSimilarity = (
    module1: ModuleInfo,
    module2: ModuleInfo,
  ): number => {
    const set1 = new Set(module1.implements);
    const set2 = new Set(module2.implements);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  };

  // Build similarity graph
  const similarityThreshold = 0.25; // At least 25% overlap
  const moduleGraph = new Map<string, Set<string>>();

  for (const module of modules) {
    moduleGraph.set(module.packageName, new Set());
  }

  // Add edges for similar modules
  for (let index = 0; index < modules.length; index++) {
    for (let index_ = index + 1; index_ < modules.length; index_++) {
      const similarity = calculateJaccardSimilarity(
        modules[index],
        modules[index_],
      );

      if (similarity >= similarityThreshold) {
        moduleGraph
          .get(modules[index].packageName)!
          .add(modules[index_].packageName);
        moduleGraph
          .get(modules[index_].packageName)!
          .add(modules[index].packageName);
      }
    }
  }

  // Find connected components in the similarity graph
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const module of modules) {
    if (!visited.has(module.packageName)) {
      const component: string[] = [];
      dfs(module.packageName, moduleGraph, visited, component);
      components.push(component);
    }
  }

  // Convert components to clusters
  let clusterIndex = 0;
  for (const component of components) {
    const moduleInfos = component.map(
      name => modules.find(m => m.packageName === name)!,
    );
    const allContracts = new Set<ContractName>();

    for (const module of moduleInfos) {
      module.implements.forEach(impl => allContracts.add(impl));
    }

    // Generate cluster name based on module prefixes first, then contract patterns
    let clusterName: string;

    if (component.length === 1) {
      // Single module cluster - use module-based name
      const module = moduleInfos[0];
      const baseName = module.packageName.split('-')[0];
      clusterName = capitalizeFirst(baseName);
    } else {
      // Multi-module cluster - check for common prefix first
      const moduleNames = component.map(name => name);
      const firstModuleParts = moduleNames[0].split('-');

      // Find the longest common prefix
      let commonPrefix = '';
      for (let index = 0; index < firstModuleParts.length; index++) {
        const part = firstModuleParts[index];
        if (moduleNames.every(name => name.split('-')[index] === part)) {
          commonPrefix += (commonPrefix ? '-' : '') + part;
        } else {
          break;
        }
      }

      if (commonPrefix && commonPrefix !== firstModuleParts[0]) {
        // Multi-word prefix found
        clusterName = kebabToTitle(commonPrefix);
      } else if (commonPrefix) {
        // Single word prefix found
        clusterName = capitalizeFirst(commonPrefix);
      } else {
        // No common prefix - fall back to contract-based naming
        const contractCounts = new Map<ContractName, number>();
        for (const module of moduleInfos) {
          for (const impl of module.implements) {
            contractCounts.set(impl, (contractCounts.get(impl) || 0) + 1);
          }
        }

        // Find most common contract (implemented by most modules in this cluster)
        let mostCommonContract = '';
        let maxCount = 0;
        for (const [contract, count] of contractCounts) {
          if (count > maxCount) {
            maxCount = count;
            mostCommonContract = contract;
          }
        }

        if (mostCommonContract) {
          clusterName = kebabToTitle(mostCommonContract) + ' Related';
        } else {
          clusterName = `Module Group ${clusterIndex + 1}`;
        }
      }
    }

    // Ensure unique names
    const finalName = ensureUniqueName(clusterName, moduleClusters);

    moduleClusters.set(finalName, {
      modules: moduleInfos,
      contracts: allContracts,
    });

    clusterIndex++;
  }

  return moduleClusters;
};

// Generate a Mermaid diagram showing which modules implement which contracts
const generateModuleImplementationDiagram = (
  contracts: Map<ContractName, ContractInfo>,
  modules: ModuleInfo[],
  contractNames: Set<ContractName>,
  title: string,
): string => {
  const lines: string[] = [];
  const relevantModules = modules.filter(m =>
    m.implements.some(impl => contractNames.has(impl)),
  );

  if (relevantModules.length === 0) {
    return '';
  }

  lines.push(`### ${title}`);
  lines.push('');

  // Use two-column layout for all clusters
  lines.push('```mermaid');
  lines.push('graph LR');

  // Add contract nodes
  lines.push('  subgraph Contracts');
  for (const name of contractNames) {
    const contractInfo = contracts.get(name);
    if (contractInfo) {
      const label = generateContractLabel(name, contractInfo);
      lines.push(`    ${sanitizeForMermaid(name)}["${label}"]`);
    }
  }
  lines.push('  end');

  // Add module nodes and implementation edges
  lines.push('  subgraph Modules');
  relevantModules.forEach((module, index) => {
    const moduleId = `module_${index}`;
    const label = module.packageName;
    lines.push(`    ${moduleId}["${label}"]`);
  });
  lines.push('  end');

  // Add implementation relationships
  relevantModules.forEach((module, index) => {
    const moduleId = `module_${index}`;
    for (const impl of module.implements) {
      if (contractNames.has(impl)) {
        lines.push(
          `  ${moduleId} -.->|implements| ${sanitizeForMermaid(impl)}`,
        );
      }
    }
  });

  lines.push('```');
  lines.push('');

  return lines.join('\n');
};

// Generate markdown documentation
const generateMarkdown = (
  contracts: Map<ContractName, ContractInfo>,
  modules: ModuleInfo[],
): string => {
  const sections: string[] = [];

  // Add header
  sections.push('# Contracts and Modules');
  sections.push('');
  sections.push(
    'This document provides an overview of the contract and module architecture in the Lace platform.',
  );
  sections.push('');

  // Add statistics
  sections.push('## Statistics');
  sections.push('');
  sections.push(`- **Total Contracts**: ${contracts.size}`);
  sections.push(`- **Total Modules**: ${modules.length}`);
  sections.push('');

  // Find contract clusters based on dependencies
  const contractClusters = findContractClusters(contracts);

  // Generate cluster-based diagrams
  sections.push('## Contract Clusters');
  sections.push('');
  sections.push(
    'Contracts are automatically grouped based on their dependency relationships:',
  );
  sections.push('');

  // Add a summary of clusters first
  sections.push('### Cluster Summary');
  sections.push('');
  for (const [clusterName, clusterContracts] of contractClusters) {
    const formattedName = kebabToTitle(clusterName);
    sections.push(`- **${formattedName}**: ${clusterContracts.size} contracts`);
  }
  sections.push('');

  // Generate individual cluster diagrams
  for (const [clusterName, clusterContracts] of contractClusters) {
    const formattedName = kebabToTitle(clusterName);

    if (clusterContracts.size > 12) {
      // For large clusters, create focused sub-diagrams
      // Group contracts by their direct connections
      const subgroups = new Map<string, Set<ContractName>>();
      const processed = new Set<ContractName>();

      // Find hub contracts (most connected)
      const connectionCounts = new Map<ContractName, number>();
      for (const contract of clusterContracts) {
        let count = 0;
        const info = contracts.get(contract)!;
        if (info.dependsOn) {
          count += info.dependsOn.filter(dep =>
            clusterContracts.has(dep),
          ).length;
        }
        // Count dependents
        for (const [other, otherInfo] of contracts) {
          if (
            clusterContracts.has(other) &&
            otherInfo.dependsOn?.includes(contract)
          ) {
            count++;
          }
        }
        connectionCounts.set(contract, count);
      }

      // Sort by connection count to find hubs
      const sortedContracts = Array.from(connectionCounts.entries()).sort(
        (a, b) => b[1] - a[1],
      );

      // Create subgroups around hubs
      let groupIndex = 0;
      for (const [hub] of sortedContracts) {
        if (processed.has(hub)) continue;

        const subgroup = new Set<ContractName>();
        subgroup.add(hub);
        processed.add(hub);

        // Add directly connected contracts
        const info = contracts.get(hub)!;
        if (info.dependsOn) {
          for (const dep of info.dependsOn) {
            if (clusterContracts.has(dep) && !processed.has(dep)) {
              subgroup.add(dep);
              processed.add(dep);
            }
          }
        }

        // Add dependents
        for (const [other, otherInfo] of contracts) {
          if (
            clusterContracts.has(other) &&
            !processed.has(other) &&
            otherInfo.dependsOn?.includes(hub)
          ) {
            subgroup.add(other);
            processed.add(other);
          }
        }

        // Limit subgroup size
        if (subgroup.size > 1 && subgroup.size <= 10) {
          subgroups.set(`${clusterName}-${groupIndex}`, subgroup);
          groupIndex++;
        }
      }

      // Collect any remaining unprocessed contracts
      const remaining = new Set<ContractName>();
      for (const contract of clusterContracts) {
        if (!processed.has(contract)) {
          remaining.add(contract);
        }
      }

      // Add remaining contracts to existing groups or create a final group
      if (remaining.size > 0) {
        // Try to add to existing small groups first
        for (const contract of remaining) {
          let isAdded = false;

          const hasConnectionToSubgroup = (
            contract: ContractName,
            subgroup: Set<ContractName>,
          ): boolean => {
            const info = contracts.get(contract)!;

            // Check if contract depends on any in subgroup
            if (info.dependsOn?.some(dep => subgroup.has(dep))) {
              return true;
            }

            // Check if any in subgroup depends on this contract
            return Array.from(subgroup).some(member =>
              contracts.get(member)!.dependsOn?.includes(contract),
            );
          };

          for (const [_, subgroup] of subgroups) {
            if (
              subgroup.size < 8 &&
              hasConnectionToSubgroup(contract, subgroup)
            ) {
              subgroup.add(contract);
              isAdded = true;
              break;
            }
          }

          if (!isAdded) {
            if (!subgroups.has(`${clusterName}-remaining`)) {
              subgroups.set(`${clusterName}-remaining`, new Set());
            }
            subgroups.get(`${clusterName}-remaining`)!.add(contract);
          }
        }
      }

      // Generate diagrams for subgroups
      let partNumber = 1;
      for (const [, subgroup] of subgroups) {
        if (subgroup.size > 0) {
          sections.push(
            generateContractDependencyDiagram(
              contracts,
              subgroup,
              `${formattedName} Contracts (Part ${partNumber})`,
            ),
          );
          partNumber++;
        }
      }
    } else {
      // Small clusters - show with their immediate dependencies
      const expandedSet = new Set(clusterContracts);

      // Add immediate dependencies
      for (const contractName of clusterContracts) {
        const contract = contracts.get(contractName)!;
        if (contract.dependsOn) {
          for (const dep of contract.dependsOn) {
            if (!clusterContracts.has(dep)) {
              expandedSet.add(dep);
            }
          }
        }
      }

      sections.push(
        generateContractDependencyDiagram(
          contracts,
          expandedSet,
          `${formattedName} Contracts and Dependencies`,
        ),
      );
    }
  }

  // Generate module implementation diagrams
  sections.push('## Module Implementations');
  sections.push('');
  sections.push(
    'The following diagrams show which modules implement which contracts:',
  );
  sections.push('');

  // Group modules by contract implementation patterns with graph-based clustering
  const moduleClusters = clusterModulesByImplementation(modules);

  for (const [clusterName, moduleGroup] of moduleClusters) {
    const diagram = generateModuleImplementationDiagram(
      contracts,
      moduleGroup.modules,
      moduleGroup.contracts,
      `${clusterName} Module Implementations`,
    );
    if (diagram) {
      sections.push(diagram);
    }
  }

  // Tables removed - information is shown in Mermaid diagrams above

  return sections.join('\n');
};

const promptToRemoveOrphanDirectories = async (
  directories: string[],
): Promise<void> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('\nFound orphan module directories:');
  for (const directory of directories) {
    console.log(`  - ${directory}`);
  }

  const answer = await new Promise<string>(resolve => {
    rl.question('\nRemove these orphan directories? (Y/n): ', resolve);
  });
  rl.close();

  if (answer.toLowerCase() !== 'n') {
    for (const directory of directories) {
      fs.rmdirSync(directory);
      console.log(`Removed: ${directory}`);
    }
  } else {
    console.log('Skipped removal.');
  }
};

// Main function
const main = async () => {
  console.log('Discovering contracts...');
  const contracts = discoverContracts();
  console.log(`Found ${contracts.size} contracts`);

  console.log('Discovering modules...');
  const { modules, orphanDirectories } = discoverModules();
  console.log(`Found ${modules.length} modules`);

  console.log('Generating markdown...');
  const markdown = generateMarkdown(contracts, modules);

  const outputPath = path.join(__dirname, '../docs/contracts-and-modules.md');
  fs.writeFileSync(outputPath, markdown);
  console.log(`Documentation generated at ${outputPath}`);

  if (orphanDirectories.length > 0) {
    await promptToRemoveOrphanDirectories(orphanDirectories);
  }
};

// Run the script
if (require.main === module) {
  main().catch(console.error);
}
