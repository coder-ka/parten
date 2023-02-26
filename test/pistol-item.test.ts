import assert from "assert";
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
  map,
  str,
  regex,
  GetExprValue,
} from "../lib/main";

const whitespaces = ignore(regex(/ +/));
const trim = <T>(expr: Expression<T>) =>
  map(
    seq`${opt(whitespaces)}${expr}${opt(whitespaces)}`,
    ([value]) => value as T
  );
const comma = ignore(str(","));
const bracketStart = ignore(str("("));
const bracketEnd = ignore(str(")"));

const nullLiteral = map(str("null"), () => ({ type: "null" }));
const booleanLiteral = map(
  or(str("true"), str("false")),
  (value: "true" | "false") => ({
    type: "boolean",
    value,
  })
);
const stringLiteral = map(seq`"${regex(/([^"\\]|\\.)*/)}"`, ([value]) => ({
  type: "string",
  value,
}));
const numberLiteral = map(notEmpty(regex(/\d*(\.\d+)?/)), (value: string) => ({
  type: "number",
  value: Number(value),
}));

const item = or(
  nullLiteral,
  or(
    booleanLiteral,
    or(
      stringLiteral,
      or(
        numberLiteral,
        map(lazy(fnCallLike), (value) => ({
          type: "fn-call-like",
          value,
        }))
      )
    )
  )
);

type Arg = GetExprValue<typeof item>;
function args(): Expression<Arg[]> {
  const rest = map(opt(seq`${trim(comma)}${opt(lazy(args))}`), (value) => {
    if (value === undefined) return undefined;

    return value[0];
  });

  return map(seq<Arg | Arg[] | undefined>`${trim(item)}${rest}`, (value) => {
    return value.flatMap((x) =>
      x === undefined ? [] : Array.isArray(x) ? x : [x]
    );
  });
}

type FnCallLike = {
  name: string;
  args: Arg[];
};
function fnCallLike(): Expression<FnCallLike> {
  const name = map(word(), (name) => ({ name }));
  const callArgs = map(
    opt(seq`${bracketStart}${opt(args())}${bracketEnd}`),
    (value) => {
      // TODO enhance seq parameter type inference.
      if (value === undefined) return [];
      const args = value[0];
      if (args === undefined) return [];
      return args;
    }
  );

  return map(seq<{ name: string } | Arg[]>`${name}${callArgs}`, (value) => {
    // TODO enhance seq type inference
    const name = value[0];
    if (Array.isArray(name)) return null as never;
    const args = value[1];
    if (!Array.isArray(args)) return null as never;

    return {
      name: name.name,
      args,
    };
  });
}

const pistolItem = map(zom(or(whitespaces, item)), (value) =>
  value.flatMap((x) => (x === undefined ? [] : [x]))
);

const { value } = translate(
  `  test1   test2() test3(1) test4(23,"a   \\\" hoge",true , false, null, ) test5(test6("hoge", true, null))`,
  pistolItem
);

assert.deepStrictEqual(value, [
  { type: "fn-call-like", value: { name: "test1", args: [] } },
  { type: "fn-call-like", value: { name: "test2", args: [] } },
  {
    type: "fn-call-like",
    value: { name: "test3", args: [{ type: "number", value: 1 }] },
  },
  {
    type: "fn-call-like",
    value: {
      name: "test4",
      args: [
        { type: "number", value: 23 },
        { type: "string", value: 'a   \\" hoge' },
        { type: "boolean", value: "true" },
        { type: "boolean", value: "false" },
        { type: "null" },
      ],
    },
  },
  {
    type: "fn-call-like",
    value: {
      name: "test5",
      args: [
        {
          type: "fn-call-like",
          value: {
            name: "test6",
            args: [
              { type: "string", value: "hoge" },
              { type: "boolean", value: "true" },
              { type: "null" },
            ],
          },
        },
      ],
    },
  },
]);

// console.dir(value, { depth: null });
