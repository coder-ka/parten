export type Parser = {
  parse(
    str: string,
    index?: number,
    context?: ParseContext
  ): {
    value: unknown;
    index: number;
  };
};

export type Expression = string | RegExp | Parser;

type ParseContext = {};

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
  const { index, value } = toParser(expr).parse(str);

  if (index !== str.length)
    throw new Error(
      `string length does not match.expected: ${str.length}.actual: ${index}.`
    );

  return {
    index,
    value,
  };
}

// utility parsers

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
    parse(str, index = 0, context) {
      const value = parsers.reduce((res, parser) => {
        const { index: nextIndex, value } = parser.parse(str, index, context);

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
    parse(str, index, context) {
      return toParser(resolveExpr()).parse(str, index, context);
    },
  };
}

export function or(e1: Expression, e2: Expression): Parser {
  return {
    parse(str, index, context) {
      try {
        return toParser(e1).parse(str, index, context);
      } catch (error) {
        return toParser(e2).parse(str, index, context);
      }
    },
  };
}

export function empty<T>(value: T): Parser {
  return {
    parse(_str, index = 0) {
      return {
        index,
        value,
      };
    },
  };
}

export function end<T>(value: T): Parser {
  return {
    parse(str, index = 0) {
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
    parse(str, index = 0) {
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

export function string(expr: string): Parser {
  return {
    parse(str, index = 0) {
      for (let i = 0; i < expr.length; i++) {
        if (str[index] !== expr[i]) {
          throw new Error(
            `'${str[index]}' at ${index} does not match string '${expr}'`
          );
        }

        index++;
      }

      return {
        value: undefined,
        index,
      };
    },
  };
}

export function regexp(expr: RegExp): Parser {
  return {
    parse(str, index = 0) {
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
    parse(str, index = 0) {
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
