# parten

```ts
import { integer, seq } from "parten";

const segment = integer();

const ipV4 = seq`${segment}.${segment}.${segment}.${segment}`;

const { value } = translate("192.168.1.1", ipV4);

// ["192","168","1","1"]
console.log(value);
```
