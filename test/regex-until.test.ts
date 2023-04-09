import assert from "assert";
import { translate, regexp, zom, seq, opt } from "../lib/main";

const expr = regexp(/\S+/, {
  until: /[\(\),]/,
});

const { value } = translate(
  "hoge(hoge,fuga)",
  zom(seq`${expr}${opt(regexp(/[\(,)]/))}`)
);

assert.deepStrictEqual(value, [
  ["hoge", "("],
  ["hoge", ","],
  ["fuga", ")"],
]);
