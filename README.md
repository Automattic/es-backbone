es-backbone.js
==============

ElasticSearch Backbone/Mustache library for quickly building Faceted Search front ends.

Overview
--------

If your data is already indexed and you know a bit about the ElasticSearch API, then this library should allow you to build an interactive front end for doing faceted search. I've built three so far, and the last one took 35 minutes to build, debug, and deploy.

It also uses flot to provide pretty interactive graphs as inspired by Shay's post here: 
http://www.elasticsearch.org/blog/2011/05/13/data-visualization-with-elasticsearch-and-protovis.html

See examples/simple/simple.php for all the library dependencies. Those paths are probably not the best places to serve them from.

Where to Start
--------------

In the examples directory is a simple example (but it has no server to work with). To get it working grep through the files or "TODO" and "OPTIONAL" to figure out what you need to do.

If you have a public ES endpoint I'd love to have a working example to show off in this repository.

Versions
--------

0.1 Initial Release. Works for me. ;)


