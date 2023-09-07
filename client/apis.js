 // app.ports.response.send({ some: 'object' });

 const gameGrid = [];
 const visitedNode = [];
 const diagonalLines = [];
 let isDiagonal = false;
 let selectedNode = null;
 let startPoint = null;
 let endPoint = null;
 let player = 1;
 const drawnLines = []; // Maintain a list of drawn lines, each represented as an object { start: { x, y }, end: { x, y } }

//  let gameStarted = null;

app.ports.request.subscribe((message) => {
    message = JSON.parse(message);
    console.log(Request + JSON.stringify(message));
    
    switch(message.msg){
        case 'INITIALIZE':
            initialize(message.body);
            break;
        case 'NODE_CLICKED':
            nodeClicked(message.body);
            break;
        case 'ERROR':
            error();
            break;
    }
   
});

function initialize(msgBody){
    console.log('Initilizing Grid and resetting game');

    for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
          gameGrid.push({ x, y, connected: false });
        }
    }

    app.ports.response.send({
        "msg": "INITIALIZE",
        "body": {
            "newLine": null,
            "heading": "Player" + player,
            "message": "Awaiting Player 1's Move"
        }
    });

   
  
}

function nodeClicked(point){
    if(!startPoint && !selectedNode){
        selectedNode = point;
        const res = {
            "msg": "VALID_START_NODE",
            "body": {
                "newLine": null,
                "heading": "Player" + player,
                "message": "Select a second node to complete the line."
            }
        }
        app.ports.response.send(res);
    }
    
    else if(validNode(point)){
        if(selectedNode){

            let res = {};

            if(player===1){
                player = 2;
            } else {
                player = 1;
            }

            

            if(!startPoint){
                startPoint = selectedNode;
                endPoint = point;
            } else if(JSON.stringify(startPoint) === JSON.stringify(selectedNode)){
                startPoint = point;
            } else {
                endPoint = point
            }
            visitedNode.push(JSON.stringify(selectedNode));
            visitedNode.push(JSON.stringify(point));

            if(!checkIfGameOver()){
                res = {
                    "msg": "GAME_OVER",
                    "body": {
                        "newLine": {
                            "start": {
                                "x": selectedNode.x,
                                "y": selectedNode.y
                            },
                            "end": {
                                "x": point.x,
                                "y": point.y
                            }
                        },
                        "heading": "Game Over",
                        "message": "Player "+ player +" Wins!"
                    }
                }
            }
            else { 
                    res = {
                    "msg": "VALID_END_NODE",
                    "body": {
                        "newLine": {
                            "start": {
                                "x": selectedNode.x,
                                "y": selectedNode.y
                            },
                            "end": {
                                "x": point.x,
                                "y": point.y
                            }
                        },
                        "heading": "Player" + player,
                        "message": null
                    }
                };
            }
            app.ports.response.send(res);

            selectedNode =  null;
            
        } else {
            selectedNode = point;
            const res = {
                "msg": "VALID_START_NODE",
                "body": {
                    "newLine": null,
                    "heading": "Player" + player,
                    "message": "Select a second node to complete the line."
                }
            }
            app.ports.response.send(res);
        }
    } else {
        selectedNode = null;
        const res = {
            "msg": "INVALID_END_NODE",
            "body": {
                "newLine": null,
                "heading": "Player" + player,
                "message": "Invalid move!"
            }
        };

        app.ports.response.send(res);
    }

}

function error(error){
    console.log(error)
}

function validNode(point){
    if (!selectedNode){
        return (point.x === startPoint.x && point.y === startPoint.y) || 
            (point.x === endPoint.x && point.y === endPoint.y);
    }else {
        if(visitedNode.includes(JSON.stringify(point))){
            return false;
        }
        // Logic to check if line can be drawn
        const pointXDiff = Math.abs(selectedNode.x - point.x);
        const pointYDiff = Math.abs(selectedNode.y - point.y);
        
        isDiagonal = false;
        
        if(pointXDiff === 1 && pointYDiff===1){
            isDiagonal = true;
        }
        let isValid = true;
        // check if lines are intersecting
        if(isDiagonal){
            isValid = isValidMove(selectedNode.x, selectedNode.y, point.x, point.y);
        } else {
            drawnLines.push({ start: { x: selectedNode.x, y: selectedNode.y }, end: { x: point.x, y: point.y } });
        }

        // Check if the line is horizontal, vertical, or diagonal
        return isValid && ((pointXDiff === 0 && pointYDiff === 1) ||  // Vertical
                (pointXDiff === 1 && pointYDiff === 0) || // Horizontal
                (pointXDiff === 1 && pointYDiff === 1));   // Diagnonal
        }
}

// Function to check if two line segments intersect
function doLineSegmentsIntersect(line1, line2) {
    const { x: x1, y: y1 } = line1.start;
    const { x: x2, y: y2 } = line1.end;
    const { x: x3, y: y3 } = line2.start;
    const { x: x4, y: y4 } = line2.end;
  
    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  
    if (denominator === 0) {
      // Lines are parallel, no intersection
      return false;
    }
  
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;
  
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

// Function to draw a line between nodes and check for intersections
function isValidMove(x1, y1, x2, y2) {
    const newLine = { start: { x: x1, y: y1 }, end: { x: x2, y: y2 } };

    // Check for intersections with all previously drawn lines except the immediate previous line
    for (let i = 0; i < drawnLines.length - 1; i++) {
      if (doLineSegmentsIntersect(newLine, drawnLines[i])) {
        return false; // Intersection found, invalid move
      }
    }
  
    // If no intersections were found, add the new line to the list of drawn lines
    drawnLines.push(newLine);
    return true; // Valid move
}

function checkIfGameOver() {
    const gridSize = 4; // Define the size of the grid (4x4 in this case)
    let possibleNextPointAvailable = false;

    // Define the possible relative offsets for adjacent and diagonal points
    const offsets = [
        { dx: 0, dy: 1 },   // Down
        { dx: 0, dy: -1 },  // Up
        { dx: 1, dy: 0 },   // Right
        { dx: -1, dy: 0 },  // Left
        { dx: 1, dy: 1 },   // Diagonal down-right
        { dx: -1, dy: 1 },  // Diagonal down-left
        { dx: 1, dy: -1 },  // Diagonal up-right
        { dx: -1, dy: -1 }, // Diagonal up-left
    ];

    for (const offset of offsets) {
        const nextX = startPoint.x + offset.dx;
        const nextY = startPoint.y + offset.dy;

        // Check if the next point is within the grid bounds
        if (nextX >= 0 && nextX < gridSize && nextY >= 0 && nextY < gridSize) {
            if(!visitedNode.includes(JSON.stringify({ x: nextX, y: nextY }))){
                possibleNextPointAvailable = true;
            } 
        }
    }

    for (const offset of offsets) {
        const nextX = endPoint.x + offset.dx;
        const nextY = endPoint.y + offset.dy;

        // Check if the next point is within the grid bounds
        if (nextX >= 0 && nextX < gridSize && nextY >= 0 && nextY < gridSize) {
            if(!visitedNode.includes(JSON.stringify({ x: nextX, y: nextY }))){
                possibleNextPointAvailable = true;
            } 
        }
    }

    return possibleNextPointAvailable;

}
