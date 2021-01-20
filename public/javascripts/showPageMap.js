mapboxgl.accessToken = mapToken;
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11', // stylesheet location
    center: campground.geometry.coordinates, // starting position [lng, lat]
    zoom: 10 // starting zoom
});

map.addControl(new mapboxgl.NavigationControl());
map.addControl(new mapboxgl.FullscreenControl());


new mapboxgl.Marker()
    .setLngLat(campground.geometry.coordinates)
    .setPopup(
        new mapboxgl.Popup({ offset: 25 })
            .setHTML(
                `<h3>${campground.title}</h3><p>${campground.location}</p>`
            )
    )
    .addTo(map)


var layerList1 = document.getElementById('menu1');
var inputs1 = layerList1.getElementsByTagName('input');
     
function switchLayer(layer) {
    var layerId = layer.target.id;
    map.setStyle('mapbox://styles/mapbox/' + layerId);
}
     
for (var i = 0; i < inputs1.length; i++) {
    inputs1[i].onclick = switchLayer;
}
