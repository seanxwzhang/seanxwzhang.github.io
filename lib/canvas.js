import { useEffect, useRef, useState } from 'react';

export function draw(ctx, coordinates){
  ctx.fillStyle = 'red';
  ctx.shadowColor = 'blue';
  ctx.shadowBlur = 15;
  ctx.save();
  // ctx.translate(location.x / SCALE - OFFSET, location.y / SCALE - OFFSET);
  // ctx.rotate(225 * Math.PI / 180);
  // ctx.fill(SVG_PATH);
  // .restore(): Canvas 2D API restores the most recently saved canvas state
  ctx.beginPath();
  coordinates.forEach((coordinate, index) => {
    if (index !==0) {ctx.lineTo(coordinate.x, coordinate.y); }
    ctx.moveTo(coordinate.x, coordinate.y);
  });
  // ctx.closePath();
  ctx.stroke();
  // ctx.restore();
};


export function useCanvas(){
    const canvasRef = useRef(null);
    const [convasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
    const [coordinates, setCoordinates] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(()=>{
        const canvasObj = canvasRef.current;

        const ctx = canvasObj.getContext('2d');
        // clear the canvas area before rendering the coordinates held in state

        // draw all coordinates held in state
        if (isDrawing) {
            draw(ctx, coordinates);
        }
    }, [coordinates, convasDimensions, isDrawing]);

    return [ coordinates, setCoordinates, canvasRef, convasDimensions, setCanvasDimensions, isDrawing, setIsDrawing];
}
