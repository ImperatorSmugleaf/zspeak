/**
 * Tests for the Pandemonium semantic analyzer, base
 * taken with permission from Dr. Toal's notes.
 */
import assert from "assert";
import ast from "../src/ast.js";
import analyze from "../src/analyzer.js";
import * as core from "../src/core.js";

// Programs that are semantically correct
const semanticChecks = [
    [
        "variable declarations",
        'set x: num = 1; now y: bool = false; set z: string = "pandemonium";',
    ],
    ["complex list types", "set x: [[[num]]] = [[[3, 2, 1], [4, 5, 6]]];"],
    [
        "list comparison operators",
        "print([1] C< [1, 2, 3]); print([1, 2, 3] C= [1]); print(1 in [1]);",
    ],
    ["increment and decrement", "now x: num = 10; x--; x++; ++x; --x;"],
    ["unary operators", "now x: bool = false; now y: num = 1; x = !x; y = -y;"],
    ["initialize with empty list", "set a: [num] = [];"],
    ["procedure declaration", 'proc p() {print("Hello, world!");}'],
    ["function declaration", "num f() {yeet 1;}"],
    [
        "struct declaration",
        'struct S {field; num f() {yeet 1;} proc p() {print("hi!");}}',
    ],
    [
        "class declaration",
        'class S {field; num f() {yeet 1;} proc j() {print("Howdy!");}}',
    ],
    [
        "basic assignment",
        'now v: num = 1; now s: string = "Hello!"; now b: bool = true; v = 2; s = "Goodbye!"; b = false;',
    ],
    ["assign lists", "now a: [num] = [];now b: [num] = [1];a=b;b=a;"],
    ["assign to list element", "now a: [num] = [1,2,3]; a[1]=100;"],
    ["yeet", "bool f() { yeet true; }"],
    ["yeet in nested if", "bool f() {if (true) {yeet true;}}"],
    ["nope in nested if", "while (false) {if (true) {nope;}}"],
    ["if", "if (true) {print(1);} else {print(3);}"],
    ["elif", "if (true) {print(1);} elif (true) {print(0);} else {print(3);}"],
    ["elementwise for loop", "for(now i: num = el; el in [2,3,5]) {print(1);}"],
    ["incremental for loop", "for(now i: num = 0; i < 10; i++) {print(0);}"],
    ["or", "print(true or 1<2 or false or !true);"],
    ["and", "print(true and 1<2 and false and !true);"],
    ["relations", "print(1<=2 and 1 > 2 and 3.5 < 1.2);"],
    ["ok to == lists", "print([1]==[5,8]);"],
    ["ok to != lists", "print([1]!=[5,8]);"],
    ["arithmetic", "set x:num=1;print(2*3+5^-3/2-5%8);"],
    ["variables", "now x:[[[[num]]]]=[[[[1]]]]; print(x[0][0][0][0]+2);"],
    ["subscript exp", "now a: [num]=[1,2];print(a[0]);"],
    [
        "type equivalence of nested lists",
        "num f([[num]] x) {yeet 1;} print(f([[1],[2]]));",
    ],
    [
        "function yeet types",
        `num square(num x) { yeet x * x; }
         bool even(num x) { yeet x % 2 == 0; }`,
    ],
    /* ["procs called before definition", "p(); proc p(){print(1);}"],
    [
        "functions called before definition",
        "set x: num = f(); num f(){yeet 1;}",
    ], */
    ["list parameters", "num f([num] x) {yeet 1;}"],
    ["outer variable", "set x: num = 1; while(false) {print(x);}"],
];

// Programs that are syntactically correct but have semantic errors
const semanticErrors = [
    [
        "assignment to read-only list element",
        "set l: [num] = [1]; l[0] = 0;",
        /Cannot assign to constant l/,
    ],
    ["non-distinct fields", "struct S {x; x;}", /Fields must be distinct/],
    ["non-num increment", "now x:bool=false;x++;", /a number/],
    ["non-num decrement", "now x:bool=true;x++;", /a number/],
    ["undeclared id", "print(x);", /Identifier x not declared/],
    [
        "redeclared id",
        "now x: num = 1;now x: num = 1;",
        /Identifier x already declared/,
    ],
    //["recursive struct", "struct S { x: num y: S }", /must not be recursive/],
    [
        "assign to constant",
        "set x: num = 1;x = 2;",
        /Cannot assign to constant x/,
    ],
    [
        "assign bad type",
        "now x: num = 1;x=true;",
        /Cannot assign a bool to a num/,
    ],
    [
        "assign bad list type",
        "now x: num = 1;x=[true];",
        /Cannot assign a \[bool\] to a num/,
    ],
    ["nope outside loop", "nope;", /Nope can only appear in a loop/],
    [
        "nope inside function",
        "while (true) {function f() {nope;}}",
        /Nope can only appear in a loop/,
    ],
    ["yeet outside function", "yeet 1;", /Yeet can only appear in a function/],
    [
        "yeet value from procedure",
        "proc f() {yeet 1;}",
        /Yeet can only appear in a function/,
    ],
    [
        "yeet nothing from function",
        'num f() {print("yes");}',
        /Functions must yeet a value/,
    ],
    ["yeet type mismatch", "num f() {yeet false;}", /boolean to a num/],
    [
        "non-boolean if test",
        'if (1) {print("uh");} else {print("oh");}',
        /Expected a bool/,
    ],
    ["non-boolean while test", "while (1) {print(1);}", /Expected a bool/],
    /* [
        "non-list in for",
        'for (set x: num = i; i in 100) {print("Looping!");}',
        /List expected/,
    ], */
    [
        "non-boolean conditional test",
        'if(1) {print("Error!");}',
        /Expected a boolean/,
    ],
    ["bad types for or", "print(false or 1);", /Expected a boolean/],
    ["bad types for and", "print(false and 1);", /Expected a boolean/],
    [
        "bad types for ==",
        "print(false==1);",
        /Operands do not have the same type/,
    ],
    [
        "bad types for !=",
        "print(false==1);",
        /Operands do not have the same type/,
    ],
    ["bad types for +", "print(false+1);", /Expected a number/],
    ["bad types for -", "print(false-1);", /Expected a number/],
    ["bad types for *", "print(false*1);", /Expected a number/],
    ["bad types for /", "print(false/1);", /Expected a number/],
    ["bad types for ^", "print(false^1);", /Expected a number/],
    ["bad types for <", "print(false<1);", /Expected a number/],
    ["bad types for <=", "print(false<=1);", /Expected a number/],
    ["bad types for >", "print(false>1);", /Expected a number/],
    ["bad types for >=", "print(false>=1);", /Expected a number/],
    ["bad types for !=", "print(false!=1);", /not have the same type/],
    ["bad types for negation", "print(-true);", /Expected a number/],
    ["bad types for not", 'print(!"hello");', /Expected a boolean/],
    [
        "non-numeger index",
        "now a: [num]=[1];print(a[false]);",
        /Lists can only be indexed into by integers/,
    ],
    [
        "diff type list elements",
        "print([3, true]);",
        /Not all elements have the same type/,
    ],
    [
        "shadowing",
        "now x: num = 1;\nwhile (true) {now x: num = 1;}",
        /Identifier x already declared/,
    ],
    [
        "call of uncallable",
        "now x: num = 1;\nprint(x());",
        /Call of non-function/,
    ],
    [
        "too many args",
        "proc f(num x) {print(x);}\nf(1,2);",
        /1 argument\(s\) required but 2 passed/,
    ],
    [
        "too few args",
        "proc f(num x) {print(x);}\nf();",
        /1 argument\(s\) required but 0 passed/,
    ],
    [
        "parameter type mismatch",
        "proc f(num x) {print(x);}\nf(false);",
        /Cannot assign a boolean to a num/,
    ],
    [
        "non-type in param",
        "now x: num=1;proc f(x y){print(1);}",
        /Type expected/,
    ],
    ["Non-type in yeet type", "now x: num=1;x f(){yeet 1;}", /Type expected/],
];

// Test cases for expected semantic graphs after processing the AST. In general
// this suite of cases should have a test for each kind of node, including
// nodes that get rewritten as well as those that are just "passed through"
// by the analyzer. For now, we're just testing the various rewrites only.

describe("The analyzer", () => {
    for (const [scenario, source] of semanticChecks) {
        it(`recognizes ${scenario}`, () => {
            assert.ok(analyze(ast(source)));
        });
    }
    for (const [scenario, source, errorMessagePattern] of semanticErrors) {
        it(`throws on ${scenario}`, () => {
            assert.throws(() => analyze(ast(source)), errorMessagePattern);
        });
    }
});
