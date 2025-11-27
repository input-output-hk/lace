module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow sensitive values from useSecrets in useCallback or useMemo dependencies',
      recommended: false
    },
    messages: {
      disallowedDependency: "Avoid using '{{value}}' from useSecrets in {{type}} dependencies."
    },
    schema: [] // No options needed for this rule
  },

  create(context) {
    const sensitiveProperties = ['password', 'passwordConfirmation', 'passwordRepeat'];

    let declaredSecrets = new Set();

    return {
      VariableDeclarator(node) {
        // Detect `const { password, passwordConfirmation } = useSecrets();`
        if (
          node.init &&
          node.init.type === 'CallExpression' &&
          node.init.callee.name === 'useSecrets' &&
          node.id.type === 'ObjectPattern'
        ) {
          node.id.properties.forEach((property) => {
            if (property.type === 'Property' && sensitiveProperties.includes(property.key.name)) {
              declaredSecrets.add(property.key.name);
            }
          });
        }
      },

      CallExpression(node) {
        // Detect calls to `useCallback` or `useMemo`
        if (node.callee.name === 'useCallback' || node.callee.name === 'useMemo') {
          const dependencies = node.arguments[1];

          if (dependencies && dependencies.type === 'ArrayExpression') {
            dependencies.elements.forEach((element) => {
              if (element && element.type === 'Identifier' && declaredSecrets.has(element.name)) {
                context.report({
                  node: element,
                  messageId: 'disallowedDependency',
                  data: { value: element.name, type: node.callee.name }
                });
              }
            });
          }
        }
      },

      'Program:exit'() {
        // Clean up the declaredSecrets set at the end of the program
        declaredSecrets.clear();
      }
    };
  }
};
