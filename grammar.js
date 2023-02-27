module.exports = grammar({
    name: "femto",
    extras: $ => [/\s/, $.line_comment],

    rules: {
        source_file: $ => repeat($._statement),
        word: $ => $.identifier,

        line_comment: $ => /\/\/.*[\n\r]+/,

        _statement: $ => seq(
            choice(
                $.import,
                $.constant_declaration,
                $.mutable_declaration,
                $.type_declaration,
                $.assignment,
                $.call_expression,
                $.return,
                $.break,
                $.yield,
            ),
            ";",
        ),

        _expression: $ => choice(
            $.integer_literal,
            $.float_literal,
            $.boolean_literal,
            $.variable,
            $.function_declaration,
            $.unary_expression,
            $.binary_expression,
            $.paren_expression,
            $.call_expression,
            $.struct_initializer,
        ),

        _type: $ => prec(10, choice(
            $.primitive_type,
            $.struct_type,
            $.pointer_type,
            $.identifier,
            $.scope,
        )),

        identifier: $ => /[a-zA-Z_][0-9a-zA-Z_]*/,
        field: $ => seq(token.immediate("."), field("name", $.identifier)),
        scope: $ => seq($.identifier, repeat1($.field)),

        import: $ => seq(
            "use",
            field("scope", choice($.identifier, $.scope)),
            optional(seq(
                "as",
                field("alias", $.identifier),
            )),
        ),

        constant_declaration: $ => seq(
            "let",
            field("name", choice($.identifier, $.scope)),
            optional($.type_annotation),
            "=",
            field("value", $._expression),
        ),

        mutable_declaration: $ => seq(
            "let",
            "mut",
            field("name", choice($.identifier, $.scope)),
            optional($.type_annotation),
            "=",
            field("value", $._expression),
        ),

        type_declaration: $ => seq(
            optional("distinct"),
            "type",
            field("name", choice($.identifier, $.scope)),
            "=",
            field("type", $._type),
        ),

        variable: $ => choice(
            $.identifier,
            $.scope,
            seq("*", field("pointee", $.variable)),
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

        pointer_type: $ => prec(30, seq(
            "*",
            $._type,
        )),

        integer_literal: $ => choice(
            /0b[01]+/,
            /0o[0-7]+/,
            /0x[0-9a-fA-F]+/,
            /[0-9]+(e[+-]?[0-9]+)?/,
        ),
        float_literal: $ => /[0-9]*\.[0-9]+/,
        boolean_literal: $ => choice("true", "false"),

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

        function_declaration: $ => seq(
            "fn",
            field("parameters", seq(
                "(",
                repeat(
                    seq($.parameter, optional(",")),
                ),
                ")",
            )),
            optional(field("return_type", $._type)), // return type required, but optional to help the grammar
            $.block,
        ),

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
            field("binding", choice($.constant_declaration, $.mutable_declaration, $.assignment)), ";",
            field("condition", $._expression), ";",
            field("afterthought", $.assignment),
            field("body", $.block),
        ),

        yield: $ => seq(
            "yield",
            field("value", $._expression),
        ),

        break: $ => token("break"),

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

        struct_initializer: $ => prec(20, seq(
            field("struct_name", $._type),
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
    }
})
