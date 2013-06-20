// Sprouts game board.
// François Pinard, 2013-06.

var curves = [];
var sprouts = [];

add_initial_sprouts(3);

function add_initial_sprouts(count) {
  var delta = 360 / count;
  var offset = new Point();
  var size = view.size;
  offset.length = Math.min(size.width, size.height) * 1 / 3;
  offset.angle = Math.random() * delta;
  for (var counter = 0; counter < count; counter++) {
    sprouts.push(new_sprout(view.center + offset));
    offset.angle += delta;
  };
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

function new_sprout(center) {
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

function nearest_sprout(point) {
  var best = null;
  for (var counter = 0; counter < sprouts.length; counter++) {
    var sprout = sprouts[counter];
    var distance = (sprout.data.center - point).length
    if (distance < 100 && sprout.data.links.length < 3) {
      if (best == null) {
        best = sprout;
      } else if (2 * distance < (best.data.center - point).length) {
        best = sprout;
      }
    }
  };
  return best;
}

tool.minDistance = 15;
var path;
var starting_sprout;

function onMouseDown(event) {
  starting_sprout = nearest_sprout(event.point);
  path = null;
  if (starting_sprout != null) {
    var point = starting_sprout.getNearestLocation(event.point);
    path = new Path({
      segments: [point],
      strokeColor: 'brown',
      strokeWidth: 3
    })
  }
}

function onMouseDrag(event) {
  if (path != null) {
    path.add(event.point);
    for (counter = 0; counter < curves.length; counter++) {
      if (path.getIntersections(curves[counter]).length > 0) {
        path.remove();
        path = null;
        return;
      }
    };
    // for (counter = 0; counter < sprouts.length; counter++) {
    //   if (path.getIntersections(sprouts[counter]).length > 0) {
    //     path.remove();
    //     path = null;
    //     return;
    //   }
    // }
  }
}

function onMouseUp(event) {
  if (path != null) {
    var ending_sprout = nearest_sprout(event.point);
    if (ending_sprout == null) {
      path.remove();
    } else {
      var point = ending_sprout.getNearestLocation(event.point);
      path.add(point);
      path.simplify(10);
      curves.push(path);
      var sprout = new_sprout(path.getPointAt(path.length / 2));
      sprouts.push(sprout);
      add_links(sprout, starting_sprout);
      add_links(sprout, ending_sprout);
    }
  }
}
