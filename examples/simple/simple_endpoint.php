<?php
//TODO: Need includes for Elastica (php library: https://github.com/ruflin/Elastica/)

//TODO: define array of ES servers
global $es_servers;

//OPTIONAL: only allow a whitelist of particular indices and particular fields within those indices
//  also defines highlighting and which fields to return.
$whitelist_idx = array( 
	'index/type' => array( 'highlight' => array( 'content' => array( 'fragment_size' => '50', 'number_of_fragments' => 3 ) ), 'fields' => array( 'title', 'content', 'author', 'tag' ) ),
);

if ( empty( $_REQUEST['query'] ) || empty( $_REQUEST['idx'] ) || empty( $_REQUEST['type'] ) ) {
	status_header( 400 ); //improper request
	die;
}

$idx = $_REQUEST['idx'];
$type = $_REQUEST['type'];
$query = str_replace( '\\', '', $_REQUEST['query'] );

$idx_type = $idx;
if ( '' !== $type ) 
	$idx_type .= '/' . $type;

//OPTIONAL: uncomment to enable whitelisting
//if ( ! in_array( $idx_type, array_keys( $whitelist_idx ) ) ) {
//	status_header( 403 ); //forbidden
//	die;
//}

try{
	$esclient = new Elastica_Client( array( 'servers' => $es_servers ) );
	$esQ = new Elastica_Query();
	$esQ->setRawQuery( get_object_vars( json_decode( $query ) ) );
	if ( isset( $whitelist_idx[ $idx_type ] ) ) {
		$esQ->setHighlight( array( 'fields' => $whitelist_idx[ $idx_type ][ 'highlight' ], 
			'pre_tags' => array( '<b>' ),
			'post_tags' => array( '</b>' ) ) );
		$esQ->setFields( $whitelist_idx[ $idx_type ][ 'fields' ] );
	}
	if ( '' != $type )
		$estype = $esclient->getIndex( $idx )->getType( $type );
	else
		$estype = $esclient->getIndex( $idx );

	$results = $estype->search( $esQ );
	echo json_encode( $results->getResponse()->getData() );
}
catch ( Exception $e ){
	error_log( $e->getMessage() );
	status_header( 500 ); //server error
	echo json_encode( array( 'error' => 'query_error: ' . $e->getMessage() ) );
}
