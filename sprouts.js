// Sprouts game board.
// François Pinard, 2013-06.

// Layers.
var curve_layer = project.activeLayer;
var sprout_layer = new Layer();

// Curves.
tool.minDistance = 15;
var path = null;

// Sprouts.
var starting_sprout;
add_initial_sprouts(3);

// Functions.

function add_initial_sprouts(count) {
  var delta = 360 / count;
  var offset = new Point();
  var size = view.size;
  offset.length = Math.min(size.width, size.height) * 1 / 3;
  offset.angle = Math.random() * delta;
  for (var counter = 0; counter < count; counter++) {
    new_sprout(view.center + offset);
    offset.angle += delta;
  }
}

function add_links(sprout1, sprout2) {
  sprout1.data.links.push(sprout2);
  sprout2.data.links.push(sprout1);
  if (sprout1.data.links.length > 2) {
    sprout1.fillColor = 'magenta';
    sprout1.strokeColor = 'blue';
  }
  if (sprout2.data.links.length > 2) {
    sprout2.fillColor = 'magenta';
    sprout2.strokeColor = 'blue';
  }
}

function nearest_sprout(point) {
  var best = null;
  var counter;
  for (counter = 0; counter < sprout_layer.children.length; counter++) {
    var sprout = sprout_layer.children[counter];
    var distance = (sprout.data.center - point).length
    if (distance < 100 && sprout.data.links.length < 3) {
      if (best == null || 2 * distance < (best.data.center - point).length) {
        best = sprout;
      }
    }
  };
  return best;
}

function new_sprout(center) {
  sprout_layer.activate()
  var sprout = new Path.Circle({
    center: center,
    radius: 12,
    fillColor: 'orange',
    strokeColor: 'red',
    strokeWidth: 4
  });
  sprout.data.center = center;
  sprout.data.links = []
  sprout.on('mouseenter', function() {
    if (sprout.data.links.length < 3) {
      sprout.fillColor = 'yellow';
    }
  });
  sprout.on('mouseleave', function() {
    if (sprout.data.links.length < 3) {
      sprout.fillColor = 'orange';
    }
  });
  return sprout;
}

function onMouseDown(event) {
  starting_sprout = nearest_sprout(event.point);
  if (starting_sprout == null) return;
  var point = starting_sprout.getNearestLocation(event.point);
  curve_layer.activate();
  path = new Path({
    segments: [point],
    strokeColor: 'brown',
    strokeWidth: 3
  })
}

function onMouseDrag(event) {
  if (path == null) return;
  path.add(event.point);
  if (path_touches_anything()) {
    path.remove();
    path = null;
  }
}

function onMouseUp(event) {
  if (path == null) return;
  if (path._segments.length < 3) {
    // Prevent sprouts overlapping.
    path.remove();
    path = null;
    return;
  }
  var ending_sprout = nearest_sprout(event.point);
  if (ending_sprout == null) {
    path.remove();
    path = null;
    return;
  }
  if (ending_sprout == starting_sprout &&
      starting_sprout.data.links.length > 1) {
    // Prevent looping on a sprout with no room for two more links.
    path.remove();
    path = null;
    return;
  }
  var point = ending_sprout.getNearestLocation(event.point);
  path.add(point);
  if (path_touches_anything()) {
    path.remove();
    path = null;
    return;
  }
  path.simplify(10);
  var sprout = new_sprout(path.getPointAt(path.length / 2));
  path = null;
  add_links(sprout, starting_sprout);
  add_links(sprout, ending_sprout);
}

function path_touches_anything() {
  for (var counter = 0; counter < curve_layer.children.length; counter++) {
    curve = curve_layer.children[counter]
    if (curve != path && path.getIntersections(curve).length > 0) return true;
  };
  return false;
}
