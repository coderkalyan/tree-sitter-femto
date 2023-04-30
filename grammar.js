const PREC = {
    PARENTHESES: -1,
    LOGICAL_OR: 0,
    LOGICAL_AND: 1,
    LOGICAL_XOR: 2,
    EQUALITY: 10,
    COMPARISON: 11,
    BITWISE_OR: 20,
    BITWISE_AND: 21,
    BITWISE_XOR: 22,
    BITWISE_SHIFT: 23,
    ADD: 30,
    SUBTRACT: 31,
    MULTIPLY: 32,
    DIVIDE: 33,
    MODULO: 34,
    UNARY: 35,
    MEMBER_ACCESS: 40,
    STRUCT_LITERAL: 40,
    LVALUE_BLOCK: 50,
    POINTER_TYPE: 40,
    ARRAY_TYPE: 40,
};

const builtin_types = [
    'i8',
    'i16',
    'i32',
    'i64',
    'u8',
    'u16',
    'u32',
    'u64',
    'usize',
    'isize',
    'f32',
    'f64',
    'bool',
    'char',
    'void',
];

module.exports = grammar({
    name: "femto",

    extras: $ => [/\s/, $.comment],

    word: $ => $.identifier,

    rules: {
        unit: $ => repeat(seq(repeat($.annotation), $.global_statement, ";")),

        global_statement: $ => choice(
            $.const_declaration,
            $.mut_declaration,
            $.type_declaration,
            $.use_statement,
        ),

        const_declaration: $ => seq(
            "let",
            field("name", $.scope),
            optional(seq(":", field("type", $._type))),
            optional(seq(
                "=",
                field("value", $._expression),
            )),
        ),

        mut_declaration: $ => seq(
            "let",
            "mut",
            field("name", $.scope),
            optional(seq(":", field("type", $._type))),
            optional(seq(
                "=",
                field("value", $._expression),
            )),
        ),

        type_declaration: $ => seq(
            optional("distinct"),
            "type",
            field("name", $.scope),
            "=",
            field("type", $._type),
        ),

        scope: $ => seq(
            optional(seq($.scope, ".")),
            $.identifier,
        ),

        _type: $ => choice(
            $.builtin_type,
            $.function_type,
            $.struct_type,
            $.pointer_type,
            $.array_type,
            $.scope,
        ),

        builtin_type: _ => choice(...builtin_types),

        function_parameter: $ => seq(
            field("name", choice($.identifier, $.blank)),
            ":",
            field("type", $._type),
        ),

        function_type: $ => seq(
            "fn",
            "(",
            repeat(seq($.function_parameter, ",")),
            optional($.function_parameter),
            ")",
            field("return_type", $._type),
        ),

        struct_member: $ => seq(
            field("name", $.identifier),
            ":",
            field("type", $._type),
        ),

        struct_type: $ => seq(
            "struct",
            "{",
            repeat(seq($.struct_member, ",")),
            optional($.struct_member),
            "}",
        ),

        pointer_type: $ => prec(PREC.POINTER_TYPE, seq(
            field("base", $._type),
            "*",
        )),

        array_type: $ => prec(PREC.ARRAY_TYPE, seq(
            field("base", $._type),
            "[",
            field("length", $._expression),
            "]",
        )),

        _expression: $ => choice(
            $.integer_literal,
            $.float_literal,
            $.boolean_literal,
            $.char_literal,
            $.string_literal,
            $.null,
            $.lvalue,
            $.unary_expression,
            $.binary_expression,
            $._parentheses_expression,
            $.function_call,
            $.function_literal,
            $.struct_literal,
            $.array_literal,
        ),

        integer_literal: _ => choice(
            /0b[01]+/,
            /0o[0-7]+/,
            /[0-9]+/,
            /0x[0-9a-fA-F]+/,
        ),

        float_literal: _ => /([0-9]+\.[0-9]*)|([0-9]*\.[0-9]+)([eE][-+]?[0-9]+)?/,

        boolean_literal: _ => choice("true", "false"),

        char_literal: _ => /'((\\[abfnrtv'"\\])|.)'/,

        string_literal: _ => /"((\\[abfnrtv'"\\])|.)*"/,

        null: _ => "null",

        lvalue: $ => prec(PREC.LVALUE_BLOCK, choice(
            $.identifier,
            $.member_access,
            $.element_access,
            $.unary_expression,
        )),

        member_access: $ => prec(PREC.MEMBER_ACCESS, seq(
            $.lvalue,
            ".",
            $.identifier,
        )),

        element_access: $ => prec(PREC.MEMBER_ACCESS, seq(
            $.lvalue,
            "[",
            field("index", $._expression),
            "]",
        )),

        unary_expression: $ => prec(PREC.UNARY, seq(
            choice(
                "*",
                "&",
                "not",
                "~",
            ),
            $._expression,
        )),

        binary_expression: $ => {
            const table = [
                ["or", PREC.LOGICAL_OR],
                ["and", PREC.LOGICAL_AND],
                ["xor", PREC.LOGICAL_XOR],
                ["==", PREC.EQUALITY],
                ["!=", PREC.EQUALITY],
                ["<", PREC.COMPARISON],
                [">", PREC.COMPARISON],
                ["<=", PREC.COMPARISON],
                [">=", PREC.COMPARISON],
                ["|", PREC.BITWISE_OR],
                ["&", PREC.BITWISE_AND],
                ["^", PREC.BITWISE_XOR],
                ["<<", PREC.BITWISE_SHIFT],
                [">>", PREC.BITWISE_SHIFT],
                ['+', PREC.ADD],
                ['-', PREC.SUBTRACT],
                ['*', PREC.MULTIPLY],
                ['/', PREC.DIVIDE],
                ['%', PREC.MODULO],
            ];

            return choice(...table.map(([operator, precedence]) => {
                return prec.left(precedence, seq(
                    field("left", $._expression),
                    field("operator", operator),
                    field("right", $._expression),
                ));
            }));
        },

        _parentheses_expression: $ => prec(PREC.PARENTHESES, seq(
            "(",
            $._expression,
            ")",
        )),

        function_call: $ => seq(
            field("function", $._expression),
            "(",
            repeat(seq($._expression, ",")),
            optional($._expression),
            ")",
        ),

        function_literal: $ => seq(
            $.function_type,
            $._function_body,
        ),

        _function_body: $ => $.block,

        block: $ => seq(
            "{",
            choice(
                $._expression,
                repeat($.statement),
            ),
            "}",
        ),

        struct_literal_member: $ => seq(
            ".",
            field("name", $.identifier),
            "=",
            field("value", $._expression),
        ),

        array_element: $ => seq(
            field("array", $._expression),
            "[",
            field("index", $._expression),
            "]",
        ),

        struct_literal: $ => prec(PREC.STRUCT_LITERAL, seq(
            field("struct", $.identifier),
            "{",
            repeat(seq($.struct_literal_member, ",")),
            optional($.struct_literal_member),
            "}",
        )),

        array_literal: $ => seq(
            "[",
            repeat(seq($._expression, ",")),
            optional(choice(
                seq($.integer_literal, token.immediate("...")),
                seq($._expression, optional("...")),
            )),
            "]",
        ),

        statement: $ => choice(
            seq($.const_declaration, ";"),
            seq($.mut_declaration, ";"),
            seq($.assignment, ";"),
            seq($.return_statement, ";"),
            seq($.yield_statement, ";"),
            seq($.break_statement, ";"),
            seq($.function_call, ";"),
            $.conditional_expression,
            $.loop,
        ),

        assignment: $ => seq(
            $.lvalue,
            choice(
                "=",
                "+=",
                "-=",
                "*=",
                "/=",
                "%=",
                "|=",
                "&=",
                "^=",
                "<<=",
                ">>=",
            ),
            $._expression,
        ),

        conditional_expression: $ => seq(
            "if",
            field("condition", $._expression),
            $.block,
            optional(seq(
                "else",
                choice(
                    $.block,
                    $.conditional_expression,
                ),
            )),
        ),

        return_statement: $ => seq(
            "return",
            optional(field("value", $._expression)),
        ),

        yield_statement: $ => seq(
            "yield",
            optional(field("value", $._expression)),
        ),

        _loop_binding: $ => choice(
            $.const_declaration,
            $.mut_declaration,
            $.assignment,
        ),

        _loop_afterthought: $ => choice(
            $.assignment,
        ),

        loop: $ => seq(
            "for",
            optional(seq(field("binding", $._loop_binding), ";")),
            optional(field("condition", $._expression)),
            optional(seq(";", field("afterthought", $._loop_afterthought))),
            $.block,
        ),

        break_statement: $ => token("break"),

        use_statement: $ => seq(
            "use",
            $.scope,
        ),

        identifier: _ => /[a-zA-Z_][a-zA-Z0-9_]*/,
        
        annotation: _ => /@[a-zA-Z_][a-zA-Z_0-9]*/,

        blank: _ => "_",

        comment: _ => /\/\/.*[\n\r]+/,
    }
})
