
var esbbSearchQueryModel = Backbone.Model.extend({
	index: '',
	index_type: '',
	resultsModel: null,
	searching: false,
	fieldNameMap: [], // [ { "user_field" : <name>, "index_field" : <name> }, ... ]

	initialize: function() {
	},

	search : function() {
		var t = this;
		this.trigger( 'search:start' );
		this.searching = true;

		//rewrite the query, but don't want to display this for the user
		var full_query = this.toJSON();
		var query = this.getQueryString();
		_.forEach( this.fieldNameMap, function( item ) {
			query = query.replace( item.user_field, item.index_field );
		} );
		full_query.query.filtered.query.query_string.query = query;

		$.ajax( {
			url: t.ajax_url,
			type: 'POST',
			data: {
	 			'query': JSON.stringify( full_query ),
				'idx': this.index,
				'type': this.index_type,
			},
			success: function(json, statusText, xhr) {
				var data = $.parseJSON( json );
				//console.log( data );
				t.resultsModel.hasResults = true;
				t.resultsModel.hasError = false;
				t.resultsModel.set( data );
				t.trigger( 'search:end' );
			},
			error: function(xhr, message, error) {
				console.error("Error while loading data from ElasticSearch: ", message);
				console.error( error );
				console.error( xhr );
				t.resultsModel.hasResults = false;
				t.resultsModel.hasError = true;
				if ( xhr.responseText.match(/SearchPhaseExecutionException.+Failed to parse query/) )
					t.resultsModel.set( { error: 'Improperly formatted query. <a href="http://lucene.apache.org/core/old_versioned_docs/versions/2_9_1/queryparsersyntax.html" target="_blank">Check out the Lucene Query Syntax</a>.' } );
				else
					t.resultsModel.set( $.parseJSON( xhr.responseText ) );
				t.trigger( 'search:end' );
				this.searching = false;
			}
		} );
	},

	setQueryString: function( str ) {
		var curr = this.toJSON();
		curr.query.filtered.query.query_string.query = str;
		this.set( curr, { silent: true } );
	},

	getQueryString: function() {
		var curr = this.toJSON();
		var query = curr.query.filtered.query.query_string.query;
		_.forEach( this.fieldNameMap, function( item ) {
			query = query.replace( item.index_field, item.user_field );
		} );

		return query;
	},

	setSort: function( sort ) {
		var curr = this.toJSON();
		curr.sort = sort;
		this.set( curr, { silent: true } );
	},

	getSort: function() {
		var curr = this.toJSON();
		return curr.sort;
	},

	setDateHistInterval: function( facet_name, interval ) {
		var curr = this.toJSON();
		curr.facets[facet_name].date_histogram.interval = interval;
		this.set( curr, { silent: true } );
	},

	updateFilters: function( new_filters ) {
		var curr = this.toJSON()
		var curr_filt = curr.query.filtered.filter;
		if ( new_filters.length == 0 ) {
			curr.query.filtered.filter = { match_all: {} };
		}
		else {
			curr.query.filtered.filter = { and: new_filters };
		}
		this.set( curr );
	},

	getFiltersForChanging: function() {
		var curr = this.toJSON();
		var curr_filt = curr.query.filtered.filter;
		if ( curr_filt.match_all != undefined ) {
			curr_filt = { and: [] };
		}
		return curr_filt.and;
	},

	getFilters: function() {
		var curr = this.toJSON();
		var curr_filt = curr.query.filtered.filter;
		if ( typeof curr_filt.and == 'undefined' )
			return [];
		else
			return curr_filt.and;
	},

	getFilter: function( facet_type, facet_name ) {
		var curr = this.toJSON();
		var curr_filt = curr.query.filtered.filter;
		if ( typeof curr_filt.and == 'undefined' )
			return false;
		for ( var i in curr_filt.and ) {
			if ( ( typeof curr_filt.and[i][facet_type] != 'undefined' ) &&
				( typeof curr_filt.and[i][facet_type][facet_name] != 'undefined' ) )
				return curr_filt.and[i][facet_type][facet_name];
		}
		return false;
	},

	setAllTermFilters: function( list ) {
		//remove all existing terms
		var curr_filt = [];

		//add the list of terms
		_.each( list, function( val ) {
			var a = {};
			a[ val.field ] = val.term;
			curr_filt.push( { term: a } );
		} );
		this.updateFilters( curr_filt );
	},

	setTermFilters: function( facetName, list ) {
		var curr_filt = this.getFiltersForChanging();
		var new_filt = [];

		//remove all filters of this type
		_.each( curr_filt, function( val ) {
			if ( !val.term || ! val.term[facetName] )
				new_filt.push( val );
		});

		//now add them in from the list
		_.each( list, function( val ) {
			var a = {};
			a[ val.field ] = val.term;
			new_filt.push( { term: a } );
		});

		this.updateFilters( new_filt );
	},

	addTermFilter: function( field, term ) {
		var curr_filt = this.getFiltersForChanging();
		var a = {};
		a[ field ] = term;
		curr_filt.push( { term: a } );
		this.updateFilters( curr_filt );
	},

	addRangeFilter: function( field, from, to ) {
		var curr_filt = this.getFiltersForChanging();
		var a = {};
		if ( from && to )
			a[ field ] = { from: from, to: to, include_upper: false };
		else if ( from )
			a[ field ] = { from: from, include_upper: false };
		else if ( to )
			a[ field ] = { to: to, include_upper: false };
		else
			return;
		curr_filt.push( { range: a } );
		this.updateFilters( curr_filt );
	},

	removeFilter: function( facet_name, facet_type ) {
		var curr_filt = this.getFiltersForChanging();
		for ( var i in curr_filt ) {
			if ( ( typeof curr_filt[i][facet_type] != 'undefined' ) &&
					 ( typeof curr_filt[i][facet_type][facet_name] != 'undefined' ) ) {
				curr_filt.splice( i, 1 );
				i--;
			}
		}
		this.updateFilters( curr_filt );
	},

	getFacet: function( facet_name ) {
		var curr = this.toJSON();
		var curr_facets = curr.facets;
		if ( typeof curr_facets[facet_name] == 'undefined' )
			return false;

		return curr_facets[facet_name];
	},

	addFiltersFromQueryString: function( str ) {
		if ( str != '' ) {
			var filts = $.parseJSON( str )
			this.updateFilters( filts );
			this.trigger( 'change' );
		}
	},

	getURLQueryString: function() {
		var str = '';
		var q = encodeURIComponent( this.getQueryString() );
		var f = this.getFiltersAsQueryString();
		if ( q || f ) {
			str += 'q=' + q;
			if ( f != '' )
				str += '&' + f;
		}
		return str;
	},

	getFiltersAsQueryString: function() {
		var curr = this.toJSON();
		var curr_filt = curr.query.filtered.filter;
		if ( curr_filt.match_all != undefined ) {
			return '';
		}
		return $.param( { f: curr_filt.and } );
	}


});

var esbbSearchResultsModel = Backbone.Model.extend({
	hasResults: false,
	hasError: false,

	initialize: function() {
	},

});


var esbbSearchResultsView = Backbone.View.extend({
	el: '#esbb-results-set',
	header: 'Search Results',
	highlightField: 'content',
	default_data: {},
	queryModel: null,
	template: '\
		<h4>{{total}} Results</h4>\
		{{#hits}}\
		<p class="esbb-result"> \
			<span class="esbb-result-title"><a href="{{fields.url}}">{{fields.title}}</a><span><br />\
			{{{highlight.content}}}<br /><span class="esbb-result-name">{{fields.user}}</span>\
			-<span class="esbb-result-date">{{fields.date}}</span>\
		</p>\
		{{/hits}}\
		',
	templateNoResults: '\
		<h4>No Results</h4>\
		',
	templateError: '\
		<h4>Elasticsearch Server Error</h4>\
		<p>{{& error}}</p>\
		',

	initialize: function() {
		this.queryModel = this.options.queryModel;
		if ( this.options.template )
			this.template = this.options.template;
		if ( this.options.default_data )
			this.default_data = this.options.default_data;
		if ( this.options.highlightField )
			this.highlightField = this.options.highlightField;
		if ( this.options.headerName )
			this.header = this.options.headerName;
		this.model.bind( 'change', this.render, this );
		if ( this.queryModel ) {
			this.queryModel.bind('search:start', this.searchStarted, this );
			this.queryModel.bind('search:end', this.searchEnded, this );
		}
		this.render();
	},

	render: function( note ) {
		var t = this;
		this.$el.empty();
		var results = this.model.toJSON();
		if ( t.model.hasResults && ( results.hits != undefined ) && ( 0 != results.hits.total ) ) {
			for ( hit in results.hits.hits ) {
				if ( ( results.hits.hits[ hit ].highlight != undefined ) && ( typeof results.hits.hits[ hit ].highlight != 'string' ) ) {
					results.hits.hits[ hit ].highlight[ this.highlightField ] = results.hits.hits[ hit ].highlight[ this.highlightField ].join( '...' );
					results.hits.hits[ hit ].highlight[ this.highlightField ] = t.strip_tags( results.hits.hits[ hit ].highlight[ this.highlightField ], [ '<b></b>' ] );
				}
			}
			var data = this.default_data;
			data.header = this.header;
			data.hits = results.hits.hits;
			data.total = results.hits.total;

			this.$el.append( Mustache.render( this.template, data ) );
		} else {
			if ( t.model.hasError )
				this.$el.append( Mustache.render( this.templateError, results ) );
			else
				this.$el.append( Mustache.render( this.templateNoResults, { header: this.header } ) );
		}
	},

	searchStarted: function() {
		this.$el.fadeTo( 200, 0.4 );
	},

	searchEnded: function() {
		this.$el.fadeTo( 100, 1 );
	},

	strip_tags: function( input, allowed ) {
		allowed = (((allowed || "") + "").toLowerCase().match( /<[a-z][a-z0-9]*>/g ) || []).join(''); // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
		var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
		var commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
		return input.replace( commentsAndPhpTags, '').replace( tags, function ($0, $1) {
			return allowed.indexOf( '<' + $1.toLowerCase() + '>' ) > -1 ? $0 : '';
		});
	}

});

var esbbSearchFacetTimelineView = Backbone.View.extend({
	facetName: '',
	searchQueryModel: null,
	facetInterval: 1,
	horizontal: false,
	templateNoResults: '\
		<p>No results.</p>\
		',

	initialize: function() {
		this.facetName = this.options.facetName;
		if ( this.options.horizontal )
			this.horizontal = this.options.horizontal;
		this.searchQueryModel = this.options.searchQueryModel;
		this.model.bind( 'change', this.render, this );
		this.render();
	},

	render: function( note ) {
		var t = this;
		if ( ! this.model.hasResults ) {
			this.$el.empty();
			this.$el.hide();
			return;
		}
		this.$el.show();

		var data = _.map( this.model.get('facets')[this.facetName].entries, function( d ) {
			if ( t.horizontal )
				return [ d.count, d.time ];
			else
				return [ d.time, d.count ];
		});

		var facet = this.searchQueryModel.getFacet( this.facetName );
		if ( facet ) {
			switch ( facet.date_histogram.interval ) {
				case 'day':
					this.facetInterval = 1;
					break;
				case 'week':
					this.facetInterval = 7;
					break;
				case 'month':
					this.facetInterval = 30;
					break;
			}
		}

		if ( this.horizontal ) {
			var options = {
				yaxis: { mode: "time", tickLength: 5 },
				selection: { mode: "y" },
				grid: {
					hoverable: true,
					clickable: true
				 },
				series: {
					bars: {
						show: true,
						horizontal: true,
						barWidth: 24 * 60 * 60 * 1000 * this.facetInterval
					}
				}
			};
		} else {
			var options = {
				xaxis: { mode: "time", tickLength: 5 },
				selection: { mode: "x" },
				grid: {
					hoverable: true,
					clickable: true
				 },
				series: {
					bars: {
						show: true,
						barWidth: 24 * 60 * 60 * 1000 * this.facetInterval
					}
				}
			};
		}

		if ( this.facetInterval == 1 )
			options.grid.markings = this.weekendAreas;

		$.plot( this.$el, [ data ], options );

		this.$el.bind( "plotselected", function ( event, ranges ) {
			var sel_axis = this.horizontal ? ranges.yaxis : ranges.xaxis;
			var st_date = new Date( sel_axis.from );
			if ( ranges.xaxis.to - sel_axis.from < 24*60*60*1000 * t.facetInterval )
				var end_date = new Date( sel_axis.from + 24*60*60*1000 * t.facetInterval );
			else
				var end_date = new Date( sel_axis.to );

			t.setRangeFilter( st_date, end_date );
			return true;
		});

		this.$el.bind( "plotclick", function ( event, pos, item ) {
			var idx = t.horizontal ? 1 : 0;
			if (item) {
				var st_date = new Date( item.datapoint[idx] );
				var end_date = new Date( item.datapoint[idx] + 24*60*60*1000 * t.facetInterval );
				t.setRangeFilter( st_date, end_date );
			}
			return true;
		});

		this.$el.bind( "plothover", function ( event, pos, item ) {
			var idx = t.horizontal ? 1 : 0;
			if (item) {
				var st_date = t.formatDate( new Date( item.datapoint[idx] ) );
				if ( t.facetInterval == 1 ) {
					var str = st_date;
				} else {
					var end_date = t.formatDate( new Date( item.datapoint[idx] + 24*60*60*1000 * t.facetInterval ) );
					var str = st_date + ' - ' + end_date;
				}
				if ( ! t.hover_el )
					t.hover_el = $( '<div class="esbb-tl-hover"></div>' ).appendTo( 'body' );
				t.hover_el.html( str );
				t.positionTooltip( pos );
			} else {
				if ( t.hover_el ) {
					t.hover_el.remove();
					t.hover_el = null;
				}
			}
			return true;
		});

	},

	positionTooltip: function( pos ){
		if ( this.hover_el ) {
			var tPosX = pos.pageX + 10;
			var tPosY = pos.pageY + 10;
			this.hover_el.css( { 'position': 'absolute', 'top': tPosY + 'px', 'left': tPosX + 'px' } );
		}
	},

	// helper for returning the weekends in a period
	weekendAreas: function( axes ) {
		var markings = [];
		var sel_axis = this.horizontal ? axes.yaxis : axes.xaxis;
		var d = new Date(sel_axis.min);
		// go to the first Saturday
		d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 1) % 7))
		d.setUTCSeconds(0);
		d.setUTCMinutes(0);
		d.setUTCHours(0);
		var i = d.getTime();
		do {
			// when we don't set yaxis, the rectangle automatically
			// extends to infinity upwards and downwards
			if ( this.horizontal )
				markings.push({ yaxis: { from: i, to: i + 2 * 24 * 60 * 60 * 1000 } });
			else
				markings.push({ xaxis: { from: i, to: i + 2 * 24 * 60 * 60 * 1000 } });
			i += 7 * 24 * 60 * 60 * 1000;
		} while (i < sel_axis.max);

		return markings;
	},

	setRangeFilter: function( start_date, end_date ) {
		var t = this;
		t.searchQueryModel.removeFilter( t.facetName, 'range' );
		var diff = 0;
		var st_str = t.formatDate( start_date );
		var end_str = t.formatDate( end_date );
		if ( start_date && end_date ) {
			t.searchQueryModel.addRangeFilter( t.facetName, st_str, end_str );
			diff = ( end_date - start_date ) / 1000 / 60 / 60 / 24;
		} else if ( start_date ) {
			t.searchQueryModel.addRangeFilter( t.facetName, start_str, undefined );
			diff = ( new Date() - start_date ) / 1000 / 60 / 60 / 24;
		} else if ( end_date ) {
			t.searchQueryModel.addRangeFilter( t.facetName, undefined, end_str );
			diff = 365;
		}

		if ( diff < 90 )
			t.searchQueryModel.setDateHistInterval( t.facetName, 'day' );
		else if ( diff < 360 )
			t.searchQueryModel.setDateHistInterval( t.facetName, 'week' );
		else
			t.searchQueryModel.setDateHistInterval( t.facetName, 'month' );

		t.searchQueryModel.trigger('change');
		t.searchQueryModel.search( t.model );
	},

	formatDate: function( d ) {
		return d.getFullYear() + '-' + ( d.getMonth() + 1 ) + '-' + d.getDate();
	}

});

var esbbSearchFacetPieView = Backbone.View.extend({
	facetName: '',
	searchQueryModel: null,
	facetType: 'terms',
	seriesData: [],

	initialize: function() {
		this.facetName = this.options.facetName;
		if ( this.options.facetType )
			this.facetType = this.options.facetType;
		this.searchQueryModel = this.options.searchQueryModel;
		_.bindAll( this, 'render' );
		this.model.bind('change', this.render, this );
		this.render();
	},

	render: function( note ) {
		var t = this;
		if ( ! this.model.hasResults ) {
			this.$el.empty();
			this.$el.hide();
			return;
		}

		this.$el.show();

		var facet = this.model.get('facets')[this.facetName]
		var data = [];
		switch( this.facetType ) {
			case 'terms':
				data = this.calcTermsData( facet );
				break;
			case 'range':
				data = this.calcRangeData( facet );
				break;
		}

		$.plot( this.$el, data, {
			series: {
				pie: {
					show: true,
					label: {
						show: false
					}
				}
			},
			legend: {
				show: false
			},
			grid: {
				hoverable: true,
				clickable: true
			}
		});
		this.$el.append( $( '<div></div>', { 'class': 'esbb-pie-hover' } ) );

		this.$el.bind("plothover", function( ev, pos, obj ) {
			if (!obj)
				return;
			var percent = parseFloat( obj.series.percent ).toFixed(2);
			t.$el.find( '.esbb-pie-hover' ).html(
				'<span style="font-weight: bold; color: ' + obj.series.color + '">' +
				obj.series.label + ' (' + percent + '%)</span>'
			);
		} );
		this.$el.bind("plotclick", function(ev, pos, obj ) {
			if (!obj)
				return;
			switch( t.facetType ) {
				case 'terms':
					t.searchQueryModel.addTermFilter( t.facetName, obj.series.label );
					break;
				case 'range':
					t.searchQueryModel.addRangeFilter( t.facetName, t.seriesData[ obj.seriesIndex ].from, t.seriesData[ obj.seriesIndex ].to );
					break;
				default:
					return;
			}
			t.searchQueryModel.trigger('change');
			t.searchQueryModel.search( t.model );
			return true;
		} );
	},

	calcTermsData: function( facet ) {
		var terms = _.map( facet.terms, function( i ) {
			return { label: i.term, data: i.count };
		} );
		if ( facet.missing > 0 )
			terms.push( { label: 'Missing', data: facet.missing } );
		if ( facet.other > 0 )
			terms.push( { label: 'Others', data: facet.other } );
		terms = _.sortBy( terms, function ( term ) { return -term.data; });

		return terms;
	},

	calcRangeData: function( facet ) {
		var ranges = _.map( facet.ranges, function( i ) {
			var label = '';
			if ( i.from && i.to ) {
				if ( i.from == i.to - 1 )
					label = i.from;
				else
					label = i.from + '-' + ( i.to - 1 );
			}
			else if ( i.from ) {
				label = i.from + '+';
			}
			else if ( i.to ) {
				label = 'less than ' + i.to;
			}
			return {
				label: label,
				data: i.count,
				from: i.from,
				to: i.to,
			};
		} );
		ranges = _.sortBy( ranges, function ( range ) { return -range.data; });
		this.seriesData = ranges;

		return ranges;
	},

});


var esbbSearchFacetSelectView = Backbone.View.extend({
	el: '#esbb-facet-selector',
	facetName: '',
	filterName: null,
	headerName: '',
	searchQueryModel: null,
	template: '\
		<h4>{{header}}</h4>\
		<table class="esbb-facet-selector-table">\
		{{#items}}\
			<tr><td><a class="esbb-facet-item" href="{{name}}"><b>{{name}}</b></a></td><td align="right" width="100" class="esbb-count">{{count}}</td><td align="right" width="100" class="esbb-count">{{perc}}%</td></tr>\
		{{/items}}\
		{{^items}}\
			<tr><td>None</td></tr>\
		{{/items}}\
		</table>\
		',
	templateNoResults: '\
		<h4>{{header}}</h4>\
		<p>No results.</p>\
		',

	events: {
		'click a.esbb-facet-item' : 'select'
	},

	initialize: function() {
		this.facetName = this.options.facetName;
		this.filterName = this.options.filterName;
		if ( null == this.filterName )
			this.filterName = this.facetName;
		this.divName = this.options.divName;
		this.headerName = this.options.headerName;
		this.searchQueryModel = this.options.searchQueryModel;
		_.bindAll( this, 'render' );
		this.model.bind( 'change', this.render, this );
		this.render();
	},

	render: function() {
		this.$el.empty();
		var data = { header : this.headerName, items : [] };
		if ( this.model.hasResults ) {
			var facet_data = this.model.get('facets')[ this.facetName ];
			switch ( facet_data._type ) {
				case 'terms' :
					_.forEach( facet_data.terms, function( item ) {
						data['items'].push( {
							name : item.term,
							count : item.count,
							perc: ( item.count / facet_data.total * 100 ).toFixed(2)
						} );
					});
					if ( facet_data.other > 0 )
						data['items'].push( {
							name: 'Others',
							count: facet_data.other,
							perc: ( facet_data.other / facet_data.total * 100 ).toFixed(2)
						} );
					break;
				default:
					console.error( 'Facet type of ' + facet_data._type + ' for facet ' + this.facetName + ' not implemeneted.' );
					break;
			}
			this.$el.append( Mustache.render( this.template, data ) );
		} else {
			this.$el.append( Mustache.render( this.templateNoResults, { header: this.headerName } ) );
		}
	},

	select: function( ev ) {
		ev.preventDefault();
		this.searchQueryModel.addTermFilter( this.filterName, $( ev.currentTarget ).attr('href') );
		this.searchQueryModel.trigger('change');
		this.searchQueryModel.search( this.model );
	}

});

var esbbSearchFilterSelectView = Backbone.View.extend({
	select_el: '',
	select_$el: null,
	avail_fields: [],
	template: '\
			<p>Filters:\
			<input type="hidden" id="{{input_el_id}}" value="">\
			</p>\
			<p class="esbb-filter-sel-error" style="display:none; color:red"></p>\
			',

	events: {
	},

	initialize: function() {
		this.select_el = this.el.id + '-input';
		this.avail_fields = this.options.avail_fields;
		_.bindAll( this, 'render' );
		this.model.bind('change', this.render, this );
		this.render();
	},

	render: function() {
		var t = this;
		if ( this.select_$el )
			this.select_$el.select2('destroy');
		this.$el.empty();

		var filters = this.model.getFilters();
		var tags = [];
		for ( var i in filters ) {
			if ( typeof filters[i].term != 'undefined' ) {
				for ( var fld in filters[i].term ) {
					tags.push( fld + ':' + filters[i].term[fld] );
				}
			}
			//TODO: need a way to be able to successfully delete a range filter, and not have date range show up
			// else if ( typeof filters[i].range != 'undefined' ) {
			// 	for ( var fld in filters[i].range ) {
			// 		var str = fld + ':[';
			// 		if ( filters[i].range[fld].from && filters[i].range[fld].to )
			// 			str += filters[i].range[fld].from + ' TO ' + filters[i].range[fld].to + ']';
			// 		else if ( filters[i].range[fld].from )
			// 			str += filters[i].range[fld].from + ' TO *]';
			// 		else if ( filters[i].range[fld].to )
			// 			str += '* TO ' + filters[i].range[fld].to + ']';
			// 		tags.push( str );
			// 	}
			// }
		}

		//build the list of autocomplete fields
		var i = 0;
		var tag_data = _.map( this.avail_fields, function( v ) {
			return { id: v, text: v };
		} );

		this.$el.append( Mustache.render( this.template, { input_el_id: this.select_el } ) );
		this.select_$el = $( '#' + this.select_el );
		this.select_$el.attr( 'value', tags.join( ', ' ) );
		this.select_$el.select2( { tags: tag_data } );
		this.select_$el.change( function() {
			//check the input, must be 'fld:term'
			var d = t.select_$el.select2( 'val' );
			var kv = [];
			var input_ok = true;
			_.each( d, function( val ) {
				var flds = val.split( ':' );
				if ( flds.length != 2 )
					input_ok = false;
				else
					kv.push( { field: flds[0], term: flds[1] } );
			} );
			if ( ! input_ok ) {
				t.$el.find( '.esbb-filter-sel-error' ).html( 'Filters must be in the format "&ltfield&gt:&ltterm&gt", for example "content:jetpack" will search only within docs that have the term "jetpack" in the content field.' ).show();
				return;
			}

			t.$el.find( '.esbb-filter-sel-error' ).hide();
			//since this should always have all the latest term filters,
			//we can just overwrite all the query term filters
			t.model.setAllTermFilters( kv );
			t.model.trigger( 'change' );
		} );
	},

});


var esbbSearchDateRangePickerView = Backbone.View.extend({
	headerName: '',
	template: '<div class="esbb-date-range-header">{{header}}</div> <div class="esbb-date-range-input"><input class="esbb-date-range-start" type="text" /> <input class="esbb-date-range-end" type="text" /></div>',

	events : {
	},

	initialize: function() {
		this.divName = this.options.divName;
		this.headerName = this.options.headerName;
		this.facetName = this.options.facetName;
		this.searchQueryModel = this.options.searchQueryModel;
		_.bindAll( this, 'render' );
		this.model.bind('change', this.render, this );
		this.render();
	},

	render: function( note ) {
		var t = this;
		this.$el.empty();
		this.$el.append( Mustache.render( this.template, { header: this.headerName } ) );
		var curr_filter = this.model.getFilter( 'range', this.facetName );
		t.start_picker = this.$el.find( 'input.esbb-date-range-start' );
 		t.end_picker = this.$el.find( 'input.esbb-date-range-end' );

		if ( curr_filter ) {
			if ( curr_filter.from )
				t.start_picker.val( curr_filter.from );
			if ( curr_filter.to )
				t.end_picker.val( curr_filter.to );
		}

		t.start_picker.datepicker({
			defaultDate: "-6m",
			dateFormat: 'yy-mm-dd',
			changeMonth: true,
			numberOfMonths: 1
		});

		t.end_picker.datepicker({
			defaultDate: null,
			dateFormat: 'yy-mm-dd',
			changeMonth: true,
			numberOfMonths: 1
		});

		t.start_picker.change( function () {
			t.setRangeFilter();
			t.model.trigger( 'change' );
			t.model.search();
		} );

		t.end_picker.change( function () {
			t.setRangeFilter();
			t.model.trigger( 'change' );
			t.model.search();
		} );

	},

	setRangeFilter: function( ) {
		var t = this;
		t.model.removeFilter( t.facetName, 'range' );
		var st = t.start_picker.val();
		var end = t.end_picker.val();
		var diff = 1000;
		if ( st && end ) {
			t.model.addRangeFilter( t.facetName, st, end );
			diff = ( new Date( end ) - new Date( st ) ) / 1000 / 60 / 60 / 24;
		} else if ( st ) {
			t.model.addRangeFilter( t.facetName, st, undefined );
			diff = ( new Date() - new Date( st ) ) / 1000 / 60 / 60 / 24;
		} else if ( end ) {
			t.model.addRangeFilter( t.facetName, undefined, end );
			diff = 365;
		}

		if ( diff < 90 )
			t.model.setDateHistInterval( t.facetName, 'day' );
		else if ( diff < 360 )
			t.model.setDateHistInterval( t.facetName, 'week' );
		else
			t.model.setDateHistInterval( t.facetName, 'month' );
	}

});

var esbbSearchFilterTermsSelectorView = Backbone.View.extend({
	select_el: '',
	select_$el: null,
	headerName: '',
	facetName: '',
	avail_fields: [],
	template: '<div class="esbb-filter-header">{{header}}</div><input id="{{input_el_id}}" class="esbb-filter-terms" type="text"/>',

	events: {
	},

	initialize: function() {
		this.select_el = this.el.id + '-input';
		this.headerName = this.options.headerName;
		this.facetName = this.options.facetName;
		this.avail_fields = this.options.avail_fields;
		_.bindAll( this, 'render' );
		this.model.bind('change', this.render, this );
		this.render();
	},

	render: function() {
		var t = this;
		if ( this.select_$el )
			this.select_$el.select2('destroy');
		this.$el.empty();

		var filters = this.model.getFilters();
		var tags = [];
		for ( var i in filters ) {
			if ( typeof filters[i].term != 'undefined' ) {
				for ( var fld in filters[i].term ) {
					if ( fld == this.facetName )
						tags.push( filters[i].term[fld] );
				}
			}
		}

		//build the list of autocomplete fields
		var i = 0;
		var tag_data = _.map( this.avail_fields, function( v ) {
			return { id: v, text: v };
		} );

		this.$el.append( Mustache.render( this.template, { header: this.headerName, input_el_id: this.select_el } ) );
		this.select_$el = $( '#' + this.select_el );
		this.select_$el.attr( 'value', tags.join( ', ' ) );
		this.select_$el.select2( { tags: tag_data, formatNoMatches: function() { return ''; } } );
		this.select_$el.on( 'change', function( ev ) {
			var d = t.select_$el.select2( 'val' );
			var kv = [];

			_.each( d, function( val ) {
				kv.push( { field: t.facetName, term: val } );
			} );

			//since this should always have all the latest term filters,
			//we can just overwrite all the query term filters
			t.model.setTermFilters( t.facetName, kv );
			t.model.trigger( 'change' );
			t.model.search();
		} );
	},

});


var esbbSearchBarView = Backbone.View.extend({
	headerName: '',
	buttonText: 'Search',
	spinner: null,
	spin_it: false,
	enable_show_all: true,
	template: '<p>{{headerName}}<input class="esbb-search-query" type="text" style="width=500px;"  /><a href="" class="esbb-search-button">{{buttonText}}</a></p>',
	templateShowAll: '<p>{{headerName}}<input class="esbb-search-query" type="text" style="width=500px;"  /><a href="" class="esbb-search-button">{{buttonText}}</a><a href="" class="esbb-search-button-all">Show All</a></p>',

	events : {
		'click .esbb-search-button' : 'search',
		'click .esbb-search-button-all' : 'search_all',
		'keyup .esbb-search-query' : 'setQuery'
	},

	initialize: function() {
		if ( this.options.headerName )
			this.headerName = this.options.headerName;
		if ( this.options.buttonText )
			this.buttonText = this.options.buttonText;
		_.bindAll( this, 'render' );
		this.model.bind('search:start', this.startSpin, this );
		this.model.bind('search:end', this.stopSpin, this );
		this.spin_it = this.model.searching;
		this.render();
	},

	render: function( note ) {
		this.$el.empty();
		var temp = this.template;
		if ( this.enable_show_all )
			temp = this.templateShowAll;
		this.$el.append( Mustache.render( temp, { headerName: this.headerName, buttonText: this.buttonText } ) );
		this.$el.find( '.esbb-search-query' ).attr( 'value', this.model.getQueryString() ).focus();
		this.spinner = $( '<div/>', { style: 'left:640px; top: -28px;' } );
		this.spinner.spin( 'medium' );
		this.$el.append( this.spinner );
		if ( this.spin_it )
			this.spinner.show();
		else
			this.spinner.hide();
	},

	search: function( ev ) {
		if ( ev ) {
			ev.preventDefault();
			this.setQuery( null );
		}
		this.setQueryVal();
		this.model.search();
	},

	search_all: function( ev ) {
		ev.preventDefault();
		this.model.setQueryString( '*' );
		this.$el.find( '.esbb-search-query' ).attr( 'value', this.model.getQueryString() );
		this.model.trigger( 'change' );
		this.model.search();
	},

	startSpin: function() {
		this.spinner.show();
		this.spin_it = true;
	},

	stopSpin: function() {
		this.spinner.hide();
		this.spin_it = false;
	},

	setQuery: function ( ev ) {
		if ( ( ev != undefined ) && ( ev.keyCode == 13 ) ) { //enter key
			this.setQueryVal();
			this.search( null );
		}
	},

	setQueryVal: function() {
		var query = this.$el.find( '.esbb-search-query' ).val();
		this.model.setQueryString( query );
		this.model.trigger( 'change' );
	}

});


var esbbSearchURLView = Backbone.View.extend({
	baseURL: '',
	template: '<input class="esbb-search-url" readonly="readonly" value="{{url}}"></input>',
	pushstateSupported: false,

	initialize: function() {
		var t = this;
		this.baseURL = this.options.baseURL;
		this.pushstateSupported = ( 'function' == typeof( window.history.pushState ) );
		if ( this.pushstateSupported ) {
			window.onpopstate = function(e){
	    	if( e.state ){
					t.model.set( e.state );
		    }
			};
		}
		_.bindAll( this, 'render' );
		this.model.bind('change', this.render, this );
		this.render();
	},

	render: function( note ) {
		this.$el.empty();
		var qs = this.model.getURLQueryString();
		var url = document.location.href.split('?')[0] + '?' + qs + document.location.hash;

		if ( this.pushstateSupported ) {
			window.history.pushState( this.model.data, window.document.title, url);
		}	else {
			this.$el.append( Mustache.render( this.template,
				{ url: url }
			) );
		}
	}

});


var esbbSortView = Backbone.View.extend({
	headerName: 'Sort | ',
	sorts: [], //{ name: , data: }

	initialize: function() {
		var t = this;
		if ( this.options.headerName )
			this.headerName = this.options.headerName;
		this.sorts = this.options.sorts;


		_.bindAll( this, 'render' );
		this.model.bind('change', this.render, this );
		this.render();
	},

	render: function( note ) {
		var t = this;
		this.$el.empty();

		var sort = this.model.getSort();
		var selSort = -1;
		for ( var i in this.sorts ) {
			if ( JSON.stringify( this.sorts[i].data ) == JSON.stringify( sort ) )
				selSort = i;
		}

		var html = this.headerName + ' ';
		for ( var i in this.sorts ) {
			if ( i == selSort )
				html += '<b><u>' + this.sorts[i].name + '</u></b>';
			else
				html += '<a class="esbb-sort-order" data-sort-index="' + i +
					'" href="" >' + this.sorts[i].name + '</a>';
			if ( i != ( this.sorts.length - 1 ) )
				html += ' | ';
		}
		this.$el.append( Mustache.render( html ) );

		this.$el.find( "a.esbb-sort-order" ).click( function ( e ) {
			var idx = $( e.currentTarget ).attr( 'data-sort-index' );
			if ( t.sorts[idx] ) {
				t.model.setSort( t.sorts[idx].data );
				t.model.trigger('change');
				t.model.search();
			}
			return false;
		});

	}

});
