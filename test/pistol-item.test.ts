// import assert from "assert";
import {
  Expression,
  translate,
  seq,
  word,
  opt,
  zom,
  lazy,
  or,
  ignore,
  notEmpty,
} from "../lib/main";

const whitespaces = ignore(/ +/);
const trim = (expr: Expression) =>
  seq`${opt(whitespaces)}${expr}${opt(whitespaces)}`;
const comma = ignore(",");
const bracketStart = ignore("(");
const bracketEnd = ignore(")");
const nullLiteral = "null";
const booleanLiteral = or("true", "false");
const numberLiteral = notEmpty(/\d*(\.\d+)?/);
const stringLiteral = seq`${ignore('"')}${/([^"\\]|\\.)*/}${ignore('"')}`;

const arg = or(
  lazy(fnCallLike),
  or(nullLiteral, or(booleanLiteral, or(stringLiteral, numberLiteral)))
);

function args(): Expression {
  return seq`${trim(arg)}${opt(seq`${trim(comma)}${opt(lazy(args))}`)}`;
}

function fnCallLike(): Expression {
  return seq`${word()}${opt(seq`${bracketStart}${opt(args())}${bracketEnd}`)}`;
}

const expr = zom(or(whitespaces, fnCallLike()));

const { value } = translate(
  `  test1   test2() test3(1) test4(23,"a   \\\" hoge",true , false, null, ) test5(test6("hoge", true, null))`,
  expr
);

console.dir(value, {
  depth: null,
});

// assert.deepStrictEqual(value, [
//   ["test1"],
//   ["test2", ["(", ")"]],
//   ["test3", ["(", [["1"]], ")"]],
//   ["test4", ["(", [["23"], [["'", ["a"], "'"]]], ")"]],
// ]);
