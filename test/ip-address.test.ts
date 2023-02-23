import assert from "assert";
import { translate, integer, seq } from "../lib/main";

const segment = integer();

const ipV4 = seq`${segment}.${segment}.${segment}.${segment}`;

const { value } = translate("192.168.1.1", ipV4);

assert.deepStrictEqual(value, ["192", "168", "1", "1"]);
