<html>
<body>

<!-- TODO: i'm not a designer, you may want to update the style sheet, 
        very basic, please contribute improvements! :) -->
<link rel="stylesheet" type="text/css" href="css/simple.css?m=2012-06-18" />
<link rel="stylesheet" href="../../js/jquery-ui-1.8.21.custom.css" />
<link rel="stylesheet" href="https://raw.github.com/ivaynberg/select2/master/select2.css" />

<!-- Load JS libraries -->
<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js"></script>
<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jqueryui/1.8.18/jquery-ui.min.js"></script>

<script type="text/javascript" src="https://raw.github.com/janl/mustache.js/master/mustache.js"></script>
<script type="text/javascript" src="https://raw.github.com/documentcloud/underscore/master/underscore-min.js"></script>
<script type="text/javascript" src="https://raw.github.com/documentcloud/backbone/master/backbone-min.js"></script>
<script type="text/javascript" src="http://fgnass.github.com/spin.js/dist/spin.min.js"></script>
<script type="text/javascript" src="../../js/spin.js"></script>
<script type="text/javascript" src="../../js/jquery.spin.js"></script>
<script type="text/javascript" src="../../js/jquery.flot.min.js"></script>
<script type="text/javascript" src="../../js/jquery.flot.pie.min.js"></script>
<script type="text/javascript" src="../../js/jquery.flot.selection.min.js"></script>
<script type="text/javascript" src="../../js/jquery.deparam.js"></script>

<script type="text/javascript" src="https://raw.github.com/ivaynberg/select2/master/select2.js"></script>

<script type="text/javascript" src="../../es-backbone.js?m=2012-06-18"></script>
<script type="text/javascript" src="simple-view.js?m=2012-06-18"></script>

<script>

(function($) {
$(function(){

var esbbSimpleSearchResults = new esbbSearchResultsModel( );

//TODO: the QueryModel defines the query that will be passed to your server.
// At a minimum you should change the field names, and ensure that you define all of the facets
// that your display will depend on.
var esbbSimpleSearchQuery = new esbbSearchQueryModel( {
	size : 10,
	query : {
		filtered : {
			query : { 
				query_string: {
					fields: [ "content", "title", "tag" ],
					query: "",
					default_operator: "AND"
			} },
			filter : {
				match_all: { }
			}
	} },
	facets : {
		user : {
			terms : {
				field : "author",
				size : 10
			}
		},
		tag : {
			terms : {
				field : "tag",
				size : 10
			}
		},
		date : {
			date_histogram : {
				field    : "date",
				interval : "month"
			}
		}
	}
} );
esbbSimpleSearchQuery.resultsModel = esbbSimpleSearchResults;

//TODO: define the url for your ES endpoint, index name, and doc type name
esbbSimpleSearchQuery.ajax_url = 'URL_OF_ES_ENDPOINT';
esbbSimpleSearchQuery.index = 'INDEX_NAME';
esbbSimpleSearchQuery.index_type = 'DOC_TYPE_NAME';

	var esbbSimpleApp = new esbbSimpleAppView( { 
		model: esbbSimpleSearchResults, 
		query: esbbSimpleSearchQuery, 
		el: '#esbb-simple-app',
		id_prefix: 'esbb-simple'
	} );
	
});
})(jQuery);

</script>

<div id='esbb-simple-app'></div>

</body>
</html>
