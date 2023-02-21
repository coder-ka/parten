# parten

```ts
import { translate, integer, seq, ignore } from "parten";

const segment = integer();
const dot = ignore('.')

const ipV4 = seq`${segment}${dot}${segment}${dot}${segment}${dot}${segment}`;

const { value } = translate("192.168.1.1", ipV4);

// ["192","168","1","1"]
console.log(value);
```
