


var esbbSimpleAppView = Backbone.View.extend({
	query: null,
	//TODO: define the containing elements you want on the page (define the layout)
	template: '\
		<div id="{{prefix}}-header">\
			<div id="{{prefix}}-search-url"></div>\
			<div id="{{prefix}}-search-bar"></div>\
			<div id="{{prefix}}-search-filters"></div>\
			<div id="{{prefix}}-date-range"></div>\
		</div>\
		<div id="{{prefix}}-left-col">\
			<h3>Authors</h3><div id="{{prefix}}-author-pie" class="esbb-pie"></div>\
			<div id="{{prefix}}-tag-selector"></div>\
		</div>\
		<div id="{{prefix}}-center-col">\
			<div id="{{prefix}}-timeline" class="esbb-timeline"></div>\
			<div id="{{prefix}}-search-results"></div>\
		</div>\
		<div id="{{prefix}}-right-col">\
		</div>\
	',

	//TODO: customize how the results will be rendered.
	//  this is a mustache.js template (http://mustache.github.com/)
	templateResults: '\
		<h3>{{header}} [{{number}}/{{total}}]</h3>\
		{{#hits}}\
		<p class="esbb-result"> \
			<span class="esbb-result-title">{{fields.title}}<span>\
			{{highlight.content}}<br \>\
			<span class="esbb-result-name">{{fields.author}}</span>\
			- <span class="esbb-result-date">{{fields.date}}</span>\
		</p>\
		{{/hits}}\
		',


	initialize: function() {
		this.query = this.options.query;
		_.bindAll( this, 'render' );
		this.render();
	},
	
	render: function() {
		this.$el.empty();
		this.$el.html( Mustache.render( this.template, { prefix: this.options.id_prefix } ) );

		//TODO: instantiate the desired header elements and connect to the proper element ids
		//  Also don't forget to change your facetName where appropriate
		new esbbSearchURLView( { 
			model: this.query,
			baseURL: 'http://TODO_URL',
			el: '#' + this.options.id_prefix + '-search-url',
		} );
		new esbbSearchBarView( { 
			model: this.query,
			el: '#' + this.options.id_prefix + '-search-bar',
			headerName: 'Simple Search'
		} );
		new esbbSearchFilterSelectView( { 
			model: this.query, 
			el: '#' + this.options.id_prefix + '-search-filters',
			//TODO: fields that will appear in autocomplete (full syntax is "author:gibrown", so this is really just a hit to the user
			avail_fields: [ 'title:', 'content:', 'author:', 'tag:' ]
		} );
		new esbbSearchDateRangePickerView( { 
			model: this.query,
			el: '#' + this.options.id_prefix + '-date-range',
			headerName: 'Date Range',
			facetName: 'date'
		} );

		//TODO: instantiate the desired center column elements and connect to the proper element ids
		new esbbSearchFacetTimelineView( { 
			facetName: 'date',
			el: '#' + this.options.id_prefix + '-timeline',
			model: this.model,
			searchQueryModel: this.query
		} );
		new esbbSearchResultsView( { 
			model: this.model, 
			template: this.templateResults,
			el: '#' + this.options.id_prefix + '-search-results' ,
			highlightField: 'content' //TODO: set to whatever your highlighted field name is
		} );

		//TODO: instantiate the desired left column elements and connect to the proper element ids
		new esbbSearchFacetPieView( { 
			facetName: 'author',
			el: '#' + this.options.id_prefix + '-author-pie',
			model: this.model,
			searchQueryModel: this.query
		} );
		new esbbSearchFacetSelectView( { 
			facetName: 'tag',
			headerName: 'Tags',
			el: '#' + this.options.id_prefix + '-tag-selector',
			searchQueryModel: this.query,
			model: this.model
		} );
	}

	//TODO: instantiate the desired right column elements and connect to the proper element ids

});
