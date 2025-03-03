module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["./tests"],
  moduleNameMapper: {
    "^@/(.*)$": "./$1",
  },
};
