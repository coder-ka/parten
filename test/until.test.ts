import assert from "assert";
import { translate, seq, until, regexp } from "../lib/main";

const expr = seq`${until("(", regexp(/\S+/))}(${until(")", regexp(/\S+/))})`;

const { value } = translate("hogepiyo(aaa)", expr);

assert.deepStrictEqual(value, ["hogepiyo", "aaa"]);
