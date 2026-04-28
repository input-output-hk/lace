/* eslint-disable no-console */
// Babel plugin that replaces react-native imports with no-op stubs.
// The generate-contract-diagram script loads module entry points via require()
// to discover contract/module metadata. Modules that export React Native
// components pull in 'react-native', which contains Flow syntax that Node
// cannot parse. Replacing imports at the AST level avoids resolution entirely.

module.exports = ({ types: t }) => ({
  visitor: {
    ImportDeclaration: path => {
      if (path.node.source.value !== 'react-native') return;
      console.info('Patching react-native for Node.js compatibility');

      const declarations = path.node.specifiers.map(spec =>
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier(spec.local.name),
            t.arrowFunctionExpression([], t.nullLiteral()),
          ),
        ]),
      );

      if (declarations.length > 0) {
        path.replaceWithMultiple(declarations);
      } else {
        path.remove();
      }
    },
  },
});
