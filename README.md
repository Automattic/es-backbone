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


Rough description of the Backbone Objects
-----------------------------------------

Models:
- Search Results Model: esbbSearchResultsModel
- Search Query Model: esbbSearchQueryModel

Views:
- View for search query input: esbbSearchBarView
- View for displaying search results: esbbSearchResultsView
- View for a timeline of search results (date histogram facet): esbbSearchFacetTimelineView
- View for a pie chart of search results (term and range facets): esbbSearchFacetPieView
- View for values of a single facet (term facet)esbbSearchFacetSelectView
- View for adding/removing filters: esbbSearchFilterSelectView
- View for adding a date range filter: esbbSearchDateRangePickerView
- View for creating a URL to the current page: esbbSearchURLView
 

Versions
--------

pre-0.2: Many improvements to the lib, but haven't yet update the example code
- added view for sorting results: esbbSortView
- added esbbSearchFilterTermsSelectorView to have one text entry field per filter rather than a single box for all filters
- added pushstate support to modify URL in address bar
- Timeline View can be displayed with the bars shown horizontally so it can fit in the sidebar
- some changes to search results formatting
- fixed bugs in search spinner, fades out old results while new search in process
- Number of results properly displayed
- added debugging info on query syntax errors

0.1 Initial Release. Works for me. ;)


