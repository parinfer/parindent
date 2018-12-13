# Parindent

A fork of Parinfer to indent files using the following basic rules (see [discussion](https://github.com/clj-commons/formatter/issues/9)):

1. Multi-line lists that start with a symbol are always indented with two spaces.
2. Other multi-line lists, vectors, maps and sets are aligned one space after the open delimiter.
3. Multi-line lists are indented to "first-arg alignment" if and only if the 2nd line is indented as such.
4. Top-level forms must have no indentation.

