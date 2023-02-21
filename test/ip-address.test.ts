import assert from "assert";
import { translate, integer, seq, ignore } from "../lib/main";

const segment = integer();
const dot = ignore(".");

const ipV4 = seq`${segment}${dot}${segment}${dot}${segment}${dot}${segment}`;

const { value } = translate("192.168.1.1", ipV4);

assert.deepStrictEqual(value, ["192", "168", "1", "1"]);
