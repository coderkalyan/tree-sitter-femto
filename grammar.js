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

    rules: {
        unit: $ => repeat(seq($.global_statement, ";")),

        global_statement: $ => choice(
            $.const_declaration,
            $.mut_declaration,
        ),

        const_declaration: $ => seq(
            "let",
            field("name", $.identifier),
            optional(seq(":", field("type", $._type))),
            optional("="),
            optional(field("value", $._expression)),
        ),

        mut_declaration: $ => seq(
            "let",
            "mut",
            field("name", $.identifier),
            optional(seq(":", field("type", $._type))),
            optional("="),
            optional(field("value", $._expression)),
        ),

        _type: $ => choice(
            $.builtin_type,
        ),

        builtin_type: _ => choice(...builtin_types),

        _expression: $ => choice(
            $.integer_literal,
            $.float_literal,
            $.boolean_literal,
            $.char_literal,
            $.null,
        ),

        integer_literal: _ => choice(
            /0b[01]+/,
            /0o[0-7]+/,
            /[0-9]+/,
            /0x[0-9a-fA-F]+/,
        ),

        float_literal: _ => /([0-9]+\.[0-9]*)|([0-9]*\.[0-9]+)([eE][-+]?[0-9]+)?/,

        boolean_literal: _ => choice("true", "false"),

        char_literal: _ => /('\\[abfnrtv'"\\]')|('.')/,

        null: _ => "null",

        identifier: _ => /[a-zA-Z_][a-zA-Z0-9_]*/,

        comment: _ => /\/\/.*[\n\r]+/,
    }
})
