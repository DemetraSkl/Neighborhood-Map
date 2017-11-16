var map;
// New array for all location markers 
var markers = [];
// New array for Wikipedia content 
var wikiContent = [];
// Timeouts in case Google Maps API is not responsive
var timeout;
var mapTimeout;

// Wikipedia AJAX requests
function findWikiContent() {
    for (var i = 0; i < locations.length; i++) {
        var title = locations[i].title;
        // Return Wikipedia search results with 
        // associated title, short summary and page url 
        var url = "https://en.wikipedia.org/w/api.php";
        url += '?' + $.param({
            'action': 'opensearch',
            'search': title,
            'limit': 1,
            'format': 'json'
        });
        makeWikiCall(url);
    }
}

function makeWikiCall(url) {
    $.ajax({
        url: url,
        dataType: "jsonp",
        success: function(response) {
            var location = response[1][0];
            var summary = response[2][0];
            var wikiURL = response[3][0];
            loadWikiContent(wikiURL, location, summary);
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) {
            $('.msgs').text("");
            $('.msgs').text("Failed to connect to Wikipedia API, check url");
        }
    });
}

function loadWikiContent(wikiUrl, location, summary) {
    var name = location;
    var page = wikiUrl;
    var title = page.split("/");
    title = title[title.length - 1];

    // Request file name of an image on the Wikipedia page
    var url = "http://en.wikipedia.org/w/api.php";
    url += '?' + $.param({
        'action': 'parse',
        'page': title,
        'prop': 'images',
        'format': 'json'
    });
    $.ajax({
        url: url,
        dataType: "jsonp",
        success: function(response) {
            // Use image file name to request Wikipedia image url
            var img = response.parse.images[0];
            var imgURL = "http://en.wikipedia.org/w/api.php";
            imgURL += '?' + $.param({
                'action': 'query',
                'titles': 'Image:' + img,
                'prop': 'imageinfo',
                'iiprop': 'url',
                'meta': 'siteinfo',
                'siprop': 'rightsinfo',
                'format': 'json'
            });
            $.ajax({
                url: imgURL,
                dataType: "jsonp",
                success: function(imgResponse) {
                    for (var n in imgResponse.query.pages) {
                        if (imgResponse.query.pages[n].imageinfo[0].url) {
                            var finalURL = imgResponse.query.pages[n].imageinfo[0].url;
                            // Update Wikipedia content list
                            wikiContent.push({
                                'title': name,
                                'url': finalURL,
                                'summary': summary
                            });
                        }
                    }
                },
                error: function(XMLHttpRequest, textStatus, errorThrown) {
                    $('.msgs').text("");
                    $('.msgs').text("Failed to load Wikipedia content.");
                }
            });
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) {
            $('.msgs').text("");
            $('.msgs').text("Failed to load Wikipedia content");
        }
    });
}



// Google API callback method
function googleError() {
    $('.msgs').text("");
    $('.msgs').text("Failed to connect to Goodle Maps API, check url");
}

// Create map and markers
function initMap() {
    console.log("All set with Google API");
    //window.clearTimeout(timeout);
    ko.applyBindings(new ViewModel());

    // Styling of Google Map
    /*******************************
     * Title: Pale Dawn
     * Author: Krogh, A
     * Date: 10/24/2013
     * Code version: N/A
     * Availability: https://snazzymaps.com/style/1/pale-dawn.
     ********************************/
    var styles = [{
            "featureType": "administrative",
            "elementType": "all",
            "stylers": [{
                    "visibility": "on"
                },
                {
                    "lightness": 33
                }
            ]
        },
        {
            "featureType": "landscape",
            "elementType": "all",
            "stylers": [{
                "color": "#f2e5d4"
            }]
        },
        {
            "featureType": "poi.park",
            "elementType": "geometry",
            "stylers": [{
                "color": "#c5dac6"
            }]
        },
        {
            "featureType": "poi.park",
            "elementType": "labels",
            "stylers": [{
                    "visibility": "on"
                },
                {
                    "lightness": 20
                }
            ]
        },
        {
            "featureType": "road",
            "elementType": "all",
            "stylers": [{
                "lightness": 20
            }]
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry",
            "stylers": [{
                "color": "#c5c6c6"
            }]
        },
        {
            "featureType": "road.arterial",
            "elementType": "geometry",
            "stylers": [{
                "color": "#e4d7c6"
            }]
        },
        {
            "featureType": "road.local",
            "elementType": "geometry",
            "stylers": [{
                "color": "#fbfaf7"
            }]
        },
        {
            "featureType": "water",
            "elementType": "all",
            "stylers": [{
                    "visibility": "on"
                },
                {
                    "color": "#acbcc9"
                }
            ]
        }
    ];


    var mymap = document.getElementById('map');
    // Constructor creates a new map
    map = new google.maps.Map(mymap, {
        center: { lat: 40.626790, lng: 22.953065 },
        zoom: 14,
        styles: styles,
    });

    var largeInfowindow = new google.maps.InfoWindow();

    // creating initial google map markers
    for (var i = 0; i < locations.length; i++) {
        createMarker(i, largeInfowindow);
    }
    fitMarkersToMap(markers);

}


// Methods related to marker functionality
function createMarker(index, infowindow) {
    //var largeInfowindow = new google.maps.InfoWindow();

    var position = locations[index].location;
    var title = locations[index].title;
    // Create a marker per location, and put into markers array.
    var marker = new google.maps.Marker({
        map: map,
        position: position,
        title: title,
        animation: google.maps.Animation.DROP,
        id: index
    });
    marker.addListener('click', function() {
        toggleBounce(this);
    });
    marker.addListener('mouseout', function() {
        stopToggleBounce(this);
    });
    // Create an onclick event to open the large infowindow at each marker.
    marker.addListener('click', function() {
        populateInfoWindow(this, infowindow);
    });
    // Add the marker object as a locations attibute to refer to it in other
    // methods.
    locations[index].marker = marker;
    // Push the marker to our array of markers.
    markers.push(marker);
}


function fitMarkersToMap(markers) {
    var bounds = new google.maps.LatLngBounds();
    // Extend the boundaries of the map for each marker and display the marker
    for (var i = 0; i < markers.length; i++) {
        bounds.extend(markers[i].position);
    }
    map.fitBounds(bounds);
}


function toggleBounce(marker) {
    if (marker.getAnimation() !== null) {
        marker.setAnimation(null);
    } else {
        var toggleTimeout = setTimeout(function() {
            stopToggleBounce(marker);
        }, 2000);
        marker.setAnimation(google.maps.Animation.BOUNCE);
    }
}


function stopToggleBounce(marker) {
    if (marker.getAnimation() !== null) {
        marker.setAnimation(null);
    }
}


function hideMarkers() {
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
}


function filterMarkers(markers) {
    hideMarkers();
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(map);
    }
    if (markers.length > 1) {
        fitMarkersToMap(markers);
    }
}


// Methods related to marker infoWindows

// This function populates the infowindow when the marker is clicked. 
function populateInfoWindow(marker, infowindow) {
    // Check to make sure the infowindow is not already opened on this marker.
    var imgURL = '';
    var summary = '';
    var title = '';

    // Get wikipedia image url from global array 
    for (var i = 0; i < wikiContent.length; i++) {
        if (marker.title == wikiContent[i].title) {
            imgURL = wikiContent[i].url;
            summary = wikiContent[i].summary;
            title = wikiContent[i].title;
        }
    }

    if (infowindow.marker != marker) {
        // Clear the infowindow content to give the streetview time to load.
        infowindow.setContent('');
        infowindow.marker = marker;
        // Make sure the marker property is cleared if the infowindow is closed.
        infowindow.addListener('closeclick', function() {
            infowindow.marker = null;
        });

        if (imgURL !== '') {
            infowindow.setContent(
                '<div id="iw-container"><h4 id="iw-title">' +
                title +
                '</h4>' +
                '<a href="' +
                imgURL + '"">' +
                '<img src="' +
                imgURL +
                '" height="200">' +
                '</a>' +
                '<div id=summary>' +
                summary +
                '</div><div id=iw-attr> Wikipedia </div></div>');
        } else {
            infowindow.setContent(
                '<div>Could not load Wikipedia content for </div><h4>' +
                marker.title +
                '</h4>'
            );
        }
        // Open the infowindow on the correct marker.
        infowindow.open(map, marker);
    }
}


var ViewModel = function() {
    var self = this;
    var updatedMarkers = [];

    this.showList = ko.observable(true);

    this.listVisibility = function() {
        self.showList(!self.showList());
    };

    this.locationsList = ko.observableArray(locations);

    this.openInfoWindow = function(location) {
        google.maps.event.trigger(location.marker, 'click');
    };

    this.filter = ko.observable('');

    // Set visible location markers
    this.visibleLocations = ko.computed(function() {
        updatedMarkers.length = 0;
        if (self.filter() !== '') {
            return self.locationsList().filter(function(location) {
                // If filter search term matches with snippets of location
                if (!self.filter() || location.title.toLowerCase().indexOf(
                        self.filter().toLowerCase()) !== -1) {
                    updatedMarkers.push(location.marker);
                    filterMarkers(updatedMarkers);
                    return location;
                } else {
                    return filterMarkers(updatedMarkers);
                }
            });
        } else {
            filterMarkers(markers);
            return self.locationsList();
        }
    });
    findWikiContent();
};
