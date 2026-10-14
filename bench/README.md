# Performance tools

Performance runs remain separate from correctness qualification.
Host load affects elapsed times. Reports record the load and browser version.

The [accessor profile](../examples/accessor-profile) compares native processing strategies.
The [editing overhead example](../examples/editing-overhead/README.md) measures the cost of editing state.
The main example runners support optional heap captures.
`inspect-heap.mjs` reads existing heap artifacts.

The [heap findings](heap-findings.md) preserve historical measurements from the original repository.
The legacy adapter fixtures and their heap wrappers remain in that historical repository.
Their excluded commands do not form part of wfe qualification.
