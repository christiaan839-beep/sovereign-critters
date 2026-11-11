# Changelog

## 0.1.0

First release.

- Holds back a command that sends a secret file, a key-shaped value or a secret variable to a host that is not on your list.
- Holds back a WebFetch whose address carries a key.
- Hardened after an independent review before release: a sender after a bracket or keyword, a secret held in a variable or a copied file, the whole environment, globbed and quote-split names, more wrappers (eval, timeout, find -exec), more senders, a proxy or connect-to naming the real host, and more key shapes are now read; key and certificate options, download URLs, comments and local addresses no longer cause false holds; a key in a host name is never echoed.
