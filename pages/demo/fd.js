import Container from "@/components/Container";
import { useCanvas } from "@/lib/canvas";
import React, { useState, useEffect } from "react";
import { produce } from "immer";

const SCALE = 2.0;

const frechetDistance = (curve1, curve2) => {
  let n = curve1.length;
  let m = curve2.length;
  let distanceMatrix = Array(n)
    .fill()
    .map(() => Array(m).fill(-1));

  const distance = (i, j) => {
    if (distanceMatrix[i][j] > -1) {
      return distanceMatrix[i][j];
    }
    if (i == 0 && j == 0) {
      distanceMatrix[i][j] = Math.sqrt(
        Math.pow(curve1[i].x - curve2[j].x, 2) +
          Math.pow(curve1[i].y - curve2[j].y, 2)
      );
    } else if (i > 0 && j == 0) {
      distanceMatrix[i][j] = Math.max(
        distance(i - 1, 0),
        Math.sqrt(
          Math.pow(curve1[i].x - curve2[j].x, 2) +
            Math.pow(curve1[i].y - curve2[j].y, 2)
        )
      );
    } else if (i == 0 && j > 0) {
      distanceMatrix[i][j] = Math.max(
        distance(0, j - 1),
        Math.sqrt(
          Math.pow(curve1[i].x - curve2[j].x, 2) +
            Math.pow(curve1[i].y - curve2[j].y, 2)
        )
      );
    } else if (i > 0 && j > 0) {
      distanceMatrix[i][j] = Math.max(
        Math.min(
          distance(i - 1, j),
          distance(i - 1, j - 1),
          distance(i, j - 1)
        ),
        Math.sqrt(
          Math.pow(curve1[i].x - curve2[j].x, 2) +
            Math.pow(curve1[i].y - curve2[j].y, 2)
        )
      );
    }
    return distanceMatrix[i][j];
  };

  return distance(n - 1, m - 1);
};

const FdDemo = () => {
  const [
    coordinates,
    setCoordinates,
    canvasRef,
    convasDimensions,
    setCanvasDimensions,
    isDrawing,
    setIsDrawing,
  ] = useCanvas();
  const [activeCurve, setActiveCurve] = useState([]);
  const [curves, setCurves] = useState([]);
  const [fdValue, setfdValue] = useState(-1);
  const [isWalking, setIsWalking] = useState(false);
  const [walkingIdx, setWalkingIdx] = useState(0);

  const getCoord = (e) => {
    return {
      x: e.nativeEvent.offsetX * SCALE,
      y: e.nativeEvent.offsetY * SCALE,
    };
  };

  const addCoord = (coord) => {
    setCoordinates(
      coordinates.length
        ? [coordinates[coordinates.length - 1], coord]
        : [coord]
    );
  };

  const mouseDown = (e) => {
    // check if already 2 curves
    if (curves.length >= 2) {
      alert("You can only draw 2 curves");
      return;
    }
    setIsDrawing(true);
    let coord = getCoord(e);
    addCoord(coord);
    setActiveCurve([coord]);
  };

  const mouseMove = (e) => {
    if (isDrawing) {
      let coord = getCoord(e);
      addCoord(coord);
      setActiveCurve(
        produce(activeCurve, (draft) => {
          draft.push(coord);
        })
      );
    }
  };

  const mouseUp = () => {
    setIsDrawing(false);
    setCoordinates([]);
    setActiveCurve([]);
    setCurves(
      produce(curves, (draft) => {
        draft.push(activeCurve);
        if (draft.length == 2) {
          setfdValue(frechetDistance(draft[0], draft[1]));
        }
      })
    );
  };

  const clear = () => {
    canvasRef.current
      .getContext("2d")
      .clearRect(0, 0, convasDimensions.width, convasDimensions.height);
    setCoordinates([]);
    setActiveCurve([]);
    setCurves([]);
    setfdValue(-1);
    setIsWalking(false);
  };

  const interpolate = (curve, numPoints) => {
    let newCurve = [];
    for (let i = 0; i < curve.length - 1; i++) {
      let p1 = curve[i];
      let p2 = curve[i + 1];
      let dx = (p2.x - p1.x) / numPoints;
      let dy = (p2.y - p1.y) / numPoints;
      for (let j = 0; j < numPoints; j++) {
        newCurve.push({ x: p1.x + j * dx, y: p1.y + j * dy });
      }
    }
    return newCurve;
  };

  const walk = () => {
    if (curves.length < 2) {
      alert("You need to draw 2 curves first");
      return;
    }
    setIsWalking(true);
    let ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    // The procedure of walking is the follows:
    // for each index of curve1, draw a solid square at the point
    // then draw a transparent circle with radius of the frechet distance at the point
    // then draw a line to the closest point in curve2
    let curve1 = curves[0];
    let curve2 = curves[1];

    let coord1 = curve1[walkingIdx];
    if (!coord1) {
      return;
    }

    // iterate over all points in curve2 to find the closest point
    let minDist = Number.MAX_VALUE;
    let closestPoint = null;

    for (let i = 0; i < curve2.length; i++) {
      let coord2 = curve2[i];
      let dist = Math.sqrt(
        Math.pow(coord1.x - coord2.x, 2) + Math.pow(coord1.y - coord2.y, 2)
      );
      if (dist < minDist) {
        minDist = dist;
        closestPoint = coord2;
      }
    }

    // draw the square
    ctx.fillStyle = "red";
    ctx.fillRect(coord1.x - 10, coord1.y - 10, 20, 20);

    // draw the circle
    ctx.beginPath();
    ctx.arc(coord1.x, coord1.y, fdValue, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(0.5, 0, 0, 0.2)";
    ctx.stroke();

    // draw the line
    ctx.beginPath();
    ctx.moveTo(coord1.x, coord1.y);
    ctx.lineTo(closestPoint.x, closestPoint.y);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "green";
    ctx.stroke();

    // if minDist is close to frechet distance, highlight the point and the line
    if (Math.abs(minDist - fdValue) < 1) {
      ctx.fillStyle = "green";
      ctx.fillRect(closestPoint.x - 10, closestPoint.y - 10, 20, 20);
      ctx.beginPath();
      ctx.moveTo(coord1.x, coord1.y);
      ctx.lineTo(closestPoint.x, closestPoint.y);
      ctx.strokeStyle = "green";
      // thick stroke
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      let w = window.innerWidth / 2;
      let h = window.innerHeight / 2;
      setCanvasDimensions({ width: w * SCALE, height: h * SCALE });
      canvasRef.current.style.width = `${w}px`;
      canvasRef.current.style.height = `${h}px`;
    }
  }, [setCanvasDimensions, canvasRef]);

  return (
    <Container fullWidth={true} hideHeader={true}>
      <div className="flex items-center justify-between">
        <div className="flex-col">
          {isWalking && ( // create a slide in panel for walking, range is 0 to length of curve1
            <input
              className="w-full"
              type="range"
              min="0"
              max={curves[0].length}
              value={walkingIdx}
              onChange={(e) => {
                setWalkingIdx(e.target.value);
                walk();
              }}
            />
          )}
          <canvas
            id="fd-demo"
            ref={canvasRef}
            width={convasDimensions.width}
            height={convasDimensions.height}
            onMouseDown={mouseDown}
            onMouseMove={mouseMove}
            onMouseUp={mouseUp}
          />
        </div>
        <div className="flex flex-col">
          <button
            className="ml-4 my-4 bg-cyan-950 hover:bg-gray-100 text-white font-semibold py-2 px-4 border border-gray-400 rounded shadow"
            onClick={() => {
              if (curves.length < 2) {
                alert("You need to draw 2 curves first");
                return;
              }
              let curve0 = interpolate(curves[0], 10);
              let curve1 = interpolate(curves[1], 10);
              setCurves([curve0, curve1]);
              walk();
            }}
          >
            Walk
          </button>
          <button
            className="ml-4 my-4 bg-transparent bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow"
            onClick={() => clear()}
          >
            Clear
          </button>
        </div>
      </div>
      {fdValue > -1 && (
        <div className="mt-4">
          <h2 className="text-2xl">Frechet Distance: {fdValue.toFixed(3)}</h2>
        </div>
      )}
    </Container>
  );
};

export default FdDemo;
