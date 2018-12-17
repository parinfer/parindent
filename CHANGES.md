# CHANGES

## 0.2.0

relax rules:

1. ALLOW - 1-space, 2-space, or Arg-alignment (user preference determined by first sibling line)
2. ENFORCE - vertically aligned sibling lines
3. ENFORCE - indentation after a paren should imply containment

## 0.1.0

initial release

- **Zero space**:
  - Top-level forms
- **One space**:
  - Vectors, Maps, Sets
  - Lists that do NOT start with symbol
- **Two space**:
  - Lists starting with symbol, whose second line is NOT _arg aligned_
- **Arg-aligned**:
  - Lists starting with symbol, whose second line is _arg aligned_
