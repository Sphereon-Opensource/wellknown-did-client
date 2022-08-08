module.exports = {
  transform: {'^.+\\.ts?$': 'ts-jest'},
  testEnvironment: 'node',
  rootDir: ".",
  roots: ["<rootDir>/lib/", "<rootDir>/test/"],
  testMatch: ["**/?(*.)+(spec|test).+(ts|tsx|js)"],
  // testRegex: '/test/.*\\.(test|spec)?\\.ts$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
