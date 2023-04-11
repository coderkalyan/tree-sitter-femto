module.exports = grammar({
    name: "femto",
    extras: $ => [/\s/, $.line_comment],

    rules: {
        source_file: $ => repeat($._statement),
        word: $ => $.identifier,

        line_comment: $ => /\/\/.*[\n\r]+/,

        _statement_inner: $ => choice(
            $.import,
            $.include,
            $.constant_definition,
            $.mutable_definition,
            $.type_alias,
            $.type_declaration,
            $.assignment,
            $.call_expression,
            $.return,
            $.break,
            $.yield,
            $.defer,
        ),

        _statement: $ => seq(
            repeat($.annotation),
            $._statement_inner,
            ";",
        ),

        _expression: $ => choice(
            $.integer_literal,
            $.float_literal,
            $.boolean_literal,
            $.string_literal,
            $.char_literal,
            $.variable,
            $.function_definition,
            $.unary_expression,
            $.binary_expression,
            $.paren_expression,
            $.call_expression,
            // $.array_slice_index,
            $.struct_initializer,
            $.array_initializer,
        ),

        _type: $ => prec(0, choice(
            $.primitive_type,
            $.struct_type,
            $.array_type,
            $.slice_type,
            $.pointer_type,
            $.identifier,
            $.scope,
        )),

        identifier: $ => /[a-zA-Z_][0-9a-zA-Z_]*/,
        field: $ => seq(token.immediate("."), field("name", $.identifier)),
        scope: $ => seq($.identifier, repeat1($.field)),

        annotation: $ => seq(
            "@",
            choice($.identifier, $.scope),
        ),

        import: $ => seq(
            "use",
            field("scope", choice($.identifier, $.scope)),
            optional(seq(
                "as",
                field("alias", $.identifier),
            )),
        ),

        include: $ => seq(
            "include",
            field("file", $.string_literal),
            optional(seq(
                "as",
                field("alias", $.identifier),
            )),
        ),

        constant_declaration: $ => seq(
            "let",
            field("name", choice($.identifier, $.scope)),
            optional(field("type", $.type_annotation)),
        ),

        constant_definition: $ => seq(
            "let",
            field("name", choice($.identifier, $.scope)),
            optional(field("type", $.type_annotation)),
            "=",
            field("value", $._expression),
        ),

        mutable_definition: $ => seq(
            "let",
            "mut",
            field("name", choice($.identifier, $.scope)),
            optional(field("type", $.type_annotation)),
            "=",
            field("value", $._expression),
        ),

        type_alias: $ => seq(
            "type",
            field("name", choice($.identifier, $.scope)),
            "=",
            field("type", $._type),
        ),

        type_declaration: $ => seq(
            "distinct",
            "type",
            field("name", choice($.identifier, $.scope)),
            "=",
            field("type", $._type),
        ),

        variable: $ => choice(
            $.identifier,
            $.scope,
            seq("*", field("pointee", $.variable)),
            prec(20, seq(
                field("array_name", $.variable),
                "[",
                $._expression,
                "]",
            )),
        ),

        slice_range: $ => seq(
            $._expression,
            optional(seq("..", $._expression)),
        ),

        assignment: $ => seq(
            field("variable", $.variable),
            $._assignment_operator,
            field("value", $._expression),
        ),

        _assignment_operator: $ => choice(
            "=",
            "+=",
            "-=",
            "*=",
            "/=",
            "%=",
            "|=",
            "^=",
            "&=",
            ">>=",
            "<<=",
        ),

        type_annotation: $ => seq(
            ":",
            $._type
        ),

        primitive_type: $ => choice(
            "void",
            "bool",
            "i8",
            "i16",
            "i32",
            "i64",
            "u8",
            "u16",
            "u32",
            "u64",
            "f32",
            "f64",
        ),

        struct_member: $ => seq(
            field("name", $.identifier),
            field("type", $.type_annotation),
        ),

        struct_type: $ => seq(
            "struct",
            "{",
            repeat(
                seq($.struct_member, ","),
            ),
            "}",
        ),

        array_type: $ => prec(10, seq(
            field("member_type", $._type),
            "[",
            choice($.integer_literal, "_"),
            "]",
        )),

        slice_type: $ => seq(
            field("member_type", $._type),
            "[",
            optional("*"),
            "]",
        ),

        pointer_type: $ => prec(30, seq(
            $._type,
            "*",
        )),

        integer_literal: $ => choice(
            /0b[01]+/,
            /0o[0-7]+/,
            /0x[0-9a-fA-F]+/,
            /[0-9]+(e[+-]?[0-9]+)?/,
        ),
        float_literal: $ => /[0-9]*\.[0-9]+/,
        boolean_literal: $ => choice("true", "false"),
        string_literal: $ => /\"(\\.|[^\"\\])*\"/,
        char_literal: $ => /\'(\\.|[^\'\\])\'/,

        unary_expression: $ => prec(30, choice(
            seq(token.immediate("~"), $._expression),
            seq(token.immediate("-"), $._expression),
            seq("not", $._expression),
        )),

        binary_expression: $ => choice(
            prec.left(1, seq($._expression, "or", $._expression)),
            prec.left(2, seq($._expression, "and", $._expression)),
            prec.left(3, seq($._expression, "==", $._expression)),
            prec.left(3, seq($._expression, "!=", $._expression)),
            prec.left(3, seq($._expression, "<", $._expression)),
            prec.left(3, seq($._expression, ">", $._expression)),
            prec.left(3, seq($._expression, "<=", $._expression)),
            prec.left(3, seq($._expression, ">=", $._expression)),

            prec.left(11, seq($._expression, "|", $._expression)),
            prec.left(12, seq($._expression, "^", $._expression)),
            prec.left(13, seq($._expression, "&", $._expression)),
            prec.left(14, seq($._expression, "<<", $._expression)),
            prec.left(14, seq($._expression, ">>", $._expression)),

            prec.left(21, seq($._expression, "+", $._expression)),
            prec.left(21, seq($._expression, "-", $._expression)),
            prec.left(22, seq($._expression, "*", $._expression)),
            prec.left(22, seq($._expression, "/", $._expression)),
            prec.left(22, seq($._expression, "%", $._expression)),
        ),
        paren_expression: $ => seq("(", $._expression, ")"),
        
        parameter: $ => seq(
            field("name", $.identifier),
            optional(field("type", $.type_annotation)),
        ),

        function_definition: $ => prec.left(seq(
            "fn",
            field("parameters", seq(
                "(",
                repeat(
                    seq($.parameter, optional(",")),
                ),
                ")",
            )),
            optional(field("return_type", $._type)), // return type required, but optional to help the grammar
            optional($.block), // should only be ommitted on import decls
        )),

        block: $ => seq(
            "{",
            choice(
                repeat(choice(
                    $._statement,
                    $._loop,
                    $.if,
                    $.block,
                )),
                $._expression,
            ),
            "}",
        ),

        _loop: $ => choice(
            $.loop_forever,
            $.loop_condition,
            $.loop_range,
        ),

        loop_forever: $ => seq(
            "for",
            $.block,
        ),

        loop_condition: $ => seq(
            "for",
            field("condition", $._expression),
            $.block,
        ),

        loop_range: $ => seq(
            "for",
            field("binding", choice($.constant_definition, $.mutable_definition, $.assignment)), ";",
            field("condition", $._expression), ";",
            field("afterthought", $.assignment),
            field("body", $.block),
        ),

        break: $ => seq("break"),

        yield: $ => seq(
            "yield",
            field("value", $._expression),
        ),

        defer: $ => seq(
            "defer",
            field("statement", $._statement_inner),
        ),

        if: $ => seq(
            "if",
            field("condition", $._expression),
            field("body", $.block),
            optional($.else),
        ),

        else: $ => seq(
            "else",
            choice($.if, $.block),
        ),

        return: $ => seq(
            "return",
            optional(field("value", $._expression)),
        ),

        call_expression: $ => prec(10, seq(
            field("name", choice($.identifier, $.scope)),
            "(",
            repeat(seq($._expression, optional(","))),
            ")",
        )),

        array_slice_index: $ => prec(20, seq(
            field("name", choice($.identifier, $.scope)),
            "[",
            $._expression,
            "]",
        )),

        struct_initializer: $ => prec(20, seq(
            field("struct_name", choice($.identifier, $.scope, $.struct_type)),// $._type),
            "{",
            repeat(seq(
                ".",
                field("field_name", $.identifier),
                "=",
                field("value", $._expression),
                ",",
            )),
            "}",
        )),

        array_initializer: $ => prec(20, seq(
            "[",
            repeat(choice(seq(
                $._expression,
                optional(","),
            ), "...")),
            "]",
        )),
    }
})
