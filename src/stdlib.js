// STANDARD LIBRARY
/**
 * Pandemonium contains numerous built-in entities, such as 
 * object methods, types, constants, etc. This module contains
 * definitions for these entities and exports them according
 * to their category.
 */

import { Procedure, Type, Variable } from "./core.js";

function builtinFunc(name, returnType) {
    return Object.assign(new Function(name, returnType))
}

function builtinProc(name) {
    return Object.assign(new Procedure(name))
}

const listMethods = Object.freeze({
    preadd: builtinProc("preadd"),
    add: builtinProc("add"),
    insertAt: builtinProc("insertAt"),
    length: builtinFunc("length", Type.NUM)
})

const stringMethods = Object.freeze({
    symbolcount: builtinFunc("symbolcount", Type.NUM)
})

export const fundamentum = Object.freeze({
    num: Type.NUM,
    bool: Type.BOOL,
    string: Type.STRING,
    print: builtinProc("print"),
    skrrt: builtinProc("skrrt"),
    stringMethods,
    listMethods
})