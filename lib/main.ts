export interface Parser<T> {
  parse(
    str: string,
    index: number
  ): {
    value: T;
    index: number;
  };
}

export type Expression<T> = Parser<T>;
export type GetExprValue<E> = E extends Expression<infer R> ? R : never;

type TranslationResult<T> = {
  value: T;
  index: number;
};

export function toParser<T>(expr: Expression<T>): Parser<T> {
  return expr;
}

export function translate<T>(
  str: string,
  expr: Expression<T>
): TranslationResult<T> {
  const { index, value } = toParser(expr).parse(str, 0);

  if (index !== str.length)
    throw new Error(
      `string length does not match. expected: ${str.length} actual: ${index}`
    );

  return {
    index,
    value,
  };
}

// utility parsers
export function debugExpr<T>(expr: Expression<T>): Parser<T> {
  const p = toParser(expr);
  return {
    parse(str, index) {
      try {
        const res = p.parse(str, index);
        console.log("index:", res.index);
        console.dir(res.value, {
          depth: null,
        });

        return res;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  };
}

export function map<T1, T2>(
  expr: Expression<T1>,
  fn: (v: T1) => T2
): Parser<T2> {
  const p = toParser(expr);

  return {
    parse(str, index) {
      const res = p.parse(str, index);

      return {
        ...res,
        value: fn(res.value),
      };
    },
  };
}

export function check<T>(expr: Expression<T>): Parser<undefined> {
  const p = toParser(expr);

  return {
    parse(str, index) {
      const res = p.parse(str, index);

      return {
        ...res,
        value: undefined,
        index,
      };
    },
  };
}

export function seq<T>(
  strings: TemplateStringsArray,
  ...exprs: Expression<T>[]
): Parser<T[]> {
  const parsers = [
    ignore(string(strings[0])),
    ...Array(exprs.length)
      .fill(null)
      .flatMap((_, i) => [exprs[i], ignore(string(strings[i + 1]))]),
  ];

  return {
    parse(str, index) {
      const value = parsers.flatMap((parser) => {
        const { index: nextIndex, value } = parser.parse(str, index);

        index = nextIndex;
        if (value === undefined) {
          return [];
        }

        return [value];
      });

      return {
        value,
        index,
      };
    },
  };
}

export function lazy<T>(resolveExpr: () => Expression<T>): Parser<T> {
  return {
    parse(str, index) {
      return toParser(resolveExpr()).parse(str, index);
    },
  };
}

export function or<T1, T2>(
  e1: Expression<T1>,
  e2: Expression<T2>
): Parser<T1 | T2> {
  const p1 = toParser(e1);
  const p2 = toParser(e2);
  return {
    parse(str, index) {
      try {
        return p1.parse(str, index);
      } catch (error) {
        return p2.parse(str, index);
      }
    },
  };
}

export function opt<T>(expr: Expression<T>) {
  return or(expr, empty());
}

export const zom = zeroOrMore;
export function zeroOrMore<T>(
  expr: Expression<T>,
  options: { max: number } = { max: Infinity }
): Parser<T[]> {
  const parser = toParser(expr);

  return {
    parse(str, index) {
      const res = [] as T[];
      let curIndex = index;

      let i = 0;
      while (true) {
        i++;
        if (i > options.max) {
          console.log("Max zero or more times reached.");
          break;
        }
        try {
          const { index: nextIndex, value } = parser.parse(str, curIndex);

          if (value !== undefined) {
            res.push(value);
          }

          curIndex = nextIndex;
        } catch (error) {
          break;
        }
      }

      return {
        value: res,
        index: curIndex,
      };
    },
  };
}

export function ignore<T>(expr: Expression<T>): Parser<undefined> {
  const parser = toParser(expr);
  return {
    parse(str, index) {
      const res = parser.parse(str, index);

      return {
        ...res,
        value: undefined,
      };
    },
  };
}

export function notEmpty<T>(expr: Expression<T>): Parser<T> {
  const p = toParser(expr);
  return {
    parse(str, index) {
      const res = p.parse(str, index);

      if (res.value === "") throw new Error("");

      return res;
    },
  };
}

export function empty(): Parser<undefined> {
  return {
    parse(_str, index) {
      return {
        index,
        value: undefined,
      };
    },
  };
}

export function end<T>(value: T): Parser<T> {
  return {
    parse(str, index) {
      if (str.length === index) {
        return {
          index,
          value,
        };
      } else throw new Error(`string does not end at ${index}`);
    },
  };
}

export function exists(target: string): Parser<true> {
  return {
    parse(str, index) {
      for (let i = 0, imax = target.length; i < imax; i++) {
        const char = target[i];
        if (str[index + i] !== char) {
          throw new Error(`${target} not exists at ${index}.`);
        }
      }

      return {
        index: index + target.length,
        value: true,
      };
    },
  };
}

export function until<T>(
  target: string | RegExp,
  expr: Expression<T>
): Expression<T> {
  return {
    parse(str, index) {
      const until =
        typeof target === "string" ? str.indexOf(target) : str.search(target);
      const sliced = until === -1 ? str : str.slice(0, until);

      return expr.parse(sliced, index);
    },
  };
}

export function word() {
  return regexp(/^\w+/);
}

export const str = string;
export function string<TString extends string>(expr: TString): Parser<TString> {
  return {
    parse(str, index) {
      for (let i = 0; i < expr.length; i++) {
        if (str[index] !== expr[i]) {
          throw new Error(
            `'${str[index]}' at ${index} does not match string '${expr}'`
          );
        }

        index++;
      }

      return {
        value: expr,
        index,
      };
    },
  };
}

export const regex = regexp;
export function regexp(expr: RegExp): Parser<string> {
  return {
    parse(str, index) {
      const matched = expr.exec(str.slice(index));

      if (matched === null || matched.index !== 0) {
        throw new Error(`Regexp ${expr} does not match string at ${index}.`);
      }

      const matchedStr = matched[0];

      return {
        value: matchedStr,
        index: index + matchedStr.length,
      };
    },
  };
}

export function integer(): Parser<string> {
  return {
    parse(str, index) {
      let value = "";
      while (true) {
        const code = str.charCodeAt(index);

        if (code >= 48 && code <= 57) {
          value += str[index];

          index++;
        } else break;
      }

      return {
        index,
        value,
      };
    },
  };
}
