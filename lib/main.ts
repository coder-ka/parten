export interface Parser {
  parse(
    str: string,
    index: number
  ): {
    value: unknown;
    index: number;
  };
}

export type Expression = string | RegExp | Parser;

type TranslationResult = {
  value: unknown;
  index: number;
};

export function toParser(expr: Expression): Parser {
  if (typeof expr === "string") {
    return string(expr);
  } else if (expr instanceof RegExp) {
    return regexp(expr);
  } else {
    return expr;
  }
}

export function translate(str: string, expr: Expression): TranslationResult {
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
export function debugExpr(expr: Expression): Parser {
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

export function map(expr: Expression, fn: (v: unknown) => unknown): Parser {
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

export function check(expr: Expression): Parser {
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

export function seq(
  strings: TemplateStringsArray,
  ...exprs: Expression[]
): Parser {
  const parsers = [
    strings[0],
    ...Array(exprs.length)
      .fill(null)
      .flatMap((_, i) => [exprs[i], strings[i + 1]]),
  ]
    .reduce((res, item) => {
      if (item === "") return res;

      if (res.length) {
        const last = res[res.length - 1];
        if (typeof last === "string" && typeof item === "string") {
          res[res.length - 1] = last + item;
          return res;
        }
      }

      res.push(item);

      return res;
    }, [] as Expression[])
    .map(toParser);

  return {
    parse(str, index) {
      const value = parsers.reduce((res, parser) => {
        const { index: nextIndex, value } = parser.parse(str, index);

        index = nextIndex;
        if (value !== undefined) {
          res.push(value);
        }

        return res;
      }, [] as unknown[]);

      return {
        value,
        index,
      };
    },
  };
}

export function lazy(resolveExpr: () => Expression): Parser {
  return {
    parse(str, index) {
      return toParser(resolveExpr()).parse(str, index);
    },
  };
}

export function or(e1: Expression, e2: Expression): Parser {
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

export function opt(expr: Expression): Parser {
  return or(expr, empty());
}

export const zom = zeroOrMore;
export function zeroOrMore(
  expr: Expression,
  options: { max: number } = { max: Infinity }
): Parser {
  const parser = toParser(expr);

  return {
    parse(str, index) {
      const res = [] as unknown[];
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

export function ignore(expr: Expression): Parser {
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

export function notEmpty(expr: Expression): Parser {
  const p = toParser(expr);
  return {
    parse(str, index) {
      const res = p.parse(str, index);

      if (res.value === "") throw new Error("");

      return res;
    },
  };
}

export function empty(): Parser {
  return {
    parse(_str, index) {
      return {
        index,
        value: undefined,
      };
    },
  };
}

export function end<T>(value: T): Parser {
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

export function exists(target: string): Parser {
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

export function word(): Parser {
  return regexp(/^\w+/);
}

export function string(expr: string): Parser {
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

export function regexp(expr: RegExp): Parser {
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

export function integer(): Parser {
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
