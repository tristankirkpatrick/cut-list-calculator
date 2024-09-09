'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useList } from 'react-use'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Piece {
  width: number
  height: number
  id: number
}

interface Cut extends Piece {
  x: number
  y: number
  sheet: number
  label: string
}

interface Space {
  x: number
  y: number
  width: number
  height: number
  sheet: number
}

type Unit = 'cm' | 'in' | 'mm'

let nextId = 1

const AdvancedSheetCutter: React.FC = () => {
  const [sheetWidth, setSheetWidth] = useState<number>(100)
  const [sheetHeight, setSheetHeight] = useState<number>(100)
  const [pieceWidth, setPieceWidth] = useState<number | undefined>(undefined)
  const [pieceHeight, setPieceHeight] = useState<number | undefined>(undefined)
  const [pieces, { push: addPiece, removeAt: removePiece, reset: resetPieces }] = useList<Piece>([])
  const [cuts, setCuts] = useState<Cut[]>([])
  const [error, setError] = useState<string | null>(null)
  const [unit, setUnit] = useState<Unit>('cm')

  const addPieceHandler = useCallback(() => {
    if (pieceWidth && pieceHeight && pieceWidth > 0 && pieceHeight > 0) {
      addPiece({ width: pieceWidth, height: pieceHeight, id: nextId++ })
      setPieceWidth(undefined)
      setPieceHeight(undefined)
    }
  }, [pieceWidth, pieceHeight, addPiece])

  const calculateCuts = useCallback(() => {
    setError(null)
    const sortedPieces = [...pieces].sort((a, b) => b.width * b.height - a.width * a.height)
    const cuts: Cut[] = []
    const spaces: Space[] = [{ x: 0, y: 0, width: sheetWidth, height: sheetHeight, sheet: 0 }]

    for (const piece of sortedPieces) {
      let placed = false
      for (let i = 0; i < spaces.length; i++) {
        const space = spaces[i]
        if (fitPiece(piece, space, cuts)) {
          placed = true
          updateSpaces(spaces, i, piece)
          break
        }
      }
      if (!placed) {
        const newSheet = Math.max(...spaces.map(s => s.sheet)) + 1
        spaces.push({ x: 0, y: 0, width: sheetWidth, height: sheetHeight, sheet: newSheet })
        fitPiece(piece, spaces[spaces.length - 1], cuts)
        updateSpaces(spaces, spaces.length - 1, piece)
      }
    }

    // Add alphabetical labels to cuts
    cuts.forEach((cut, index) => {
      cut.label = String.fromCharCode(65 + index % 26) + (index >= 26 ? Math.floor(index / 26).toString() : '')
    })

    setCuts(cuts)
  }, [pieces, sheetWidth, sheetHeight])

  const fitPiece = (piece: Piece, space: Space, cuts: Cut[]): boolean => {
    if (piece.width <= space.width && piece.height <= space.height) {
      cuts.push({ ...piece, x: space.x, y: space.y, sheet: space.sheet, label: '' })
      return true
    }
    if (piece.height <= space.width && piece.width <= space.height) {
      cuts.push({ ...piece, x: space.x, y: space.y, width: piece.height, height: piece.width, sheet: space.sheet, label: '' })
      return true
    }
    return false
  }

  const updateSpaces = (spaces: Space[], index: number, piece: Piece) => {
    const space = spaces[index]
    spaces.splice(index, 1)
    if (space.width > piece.width) {
      spaces.push({
        x: space.x + piece.width,
        y: space.y,
        width: space.width - piece.width,
        height: piece.height,
        sheet: space.sheet
      })
    }
    if (space.height > piece.height) {
      spaces.push({
        x: space.x,
        y: space.y + piece.height,
        width: space.width,
        height: space.height - piece.height,
        sheet: space.sheet
      })
    }
  }

  const reset = useCallback(() => {
    resetPieces()
    setCuts([])
    setError(null)
  }, [resetPieces])

  const woodPattern = useMemo(() => {
    const patternId = 'woodPattern'
    return (
      <defs>
        <pattern id={patternId} patternUnits="userSpaceOnUse" width="10" height="10">
          <rect width="10" height="10" fill="#d2b48c" />
          <path d="M0 0L10 10M10 0L0 10" stroke="#c19a6b" strokeWidth="0.5" />
        </pattern>
      </defs>
    )
  }, [])

  const renderSheet = (sheetIndex: number) => {
    const sheetCuts = cuts.filter(cut => cut.sheet === sheetIndex)
    const aspectRatio = sheetWidth / sheetHeight
    const maxWidth = 600 // Maximum width of the SVG
    const maxHeight = 400 // Maximum height of the SVG

    let width, height
    if (aspectRatio > 1) {
      width = maxWidth
      height = width / aspectRatio
    } else {
      height = maxHeight
      width = height * aspectRatio
    }

    return (
      <Card key={sheetIndex} className="mb-6">
        <CardHeader>
          <CardTitle>Sheet {sheetIndex + 1}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <svg
              width={width}
              height={height}
              viewBox={`0 0 ${sheetWidth} ${sheetHeight}`}
              preserveAspectRatio="xMidYMid meet"
            >
              {woodPattern}
              <rect width={sheetWidth} height={sheetHeight} fill="url(#woodPattern)" />
              {sheetCuts.map((cut) => (
                <g key={cut.id}>
                  <rect
                    x={cut.x}
                    y={cut.y}
                    width={cut.width}
                    height={cut.height}
                    fill="none"
                    stroke="white"
                    strokeWidth="0.5"
                    strokeDasharray="4 2"
                  />
                  <text
                    x={cut.x + cut.width / 2}
                    y={cut.y + cut.height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="smaller"
                    fontWeight="bold"
                  >
                    {cut.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container mx-auto p-4 bg-gray-50">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Advanced Sheet Cutter</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Input</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Label htmlFor="unit" className="text-sm font-medium text-gray-600">Unit of Measure</Label>
              <Select value={unit} onValueChange={(value: Unit) => setUnit(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cm">Centimeters (cm)</SelectItem>
                  <SelectItem value="in">Inches (in)</SelectItem>
                  <SelectItem value="mm">Millimeters (mm)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <h2 className="text-xl font-semibold mb-4 text-gray-700">Sheet Size</h2>
            <div className="flex space-x-4 mb-6">
              <div className="flex-1">
                <Label htmlFor="sheetWidth" className="text-sm font-medium text-gray-600">Width ({unit})</Label>
                <Input
                  id="sheetWidth"
                  type="number"
                  value={sheetWidth}
                  onChange={(e) => setSheetWidth(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="sheetHeight" className="text-sm font-medium text-gray-600">Height ({unit})</Label>
                <Input
                  id="sheetHeight"
                  type="number"
                  value={sheetHeight}
                  onChange={(e) => setSheetHeight(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>

            <h2 className="text-xl font-semibold mb-4 text-gray-700">Add Piece</h2>
            <div className="flex space-x-4 mb-4">
              <div className="flex-1">
                <Label htmlFor="pieceWidth" className="text-sm font-medium text-gray-600">Width ({unit})</Label>
                <Input
                  id="pieceWidth"
                  type="number"
                  value={pieceWidth ?? ''}
                  onChange={(e) => setPieceWidth(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="pieceHeight" className="text-sm font-medium text-gray-600">Height ({unit})</Label>
                <Input
                  id="pieceHeight"
                  type="number"
                  value={pieceHeight ?? ''}
                  onChange={(e) => setPieceHeight(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>
            <Button onClick={addPieceHandler} className="w-full mb-6">Add Piece</Button>

            <h2 className="text-xl font-semibold mb-4 text-gray-700">Pieces to Cut</h2>
            <ul className="list-disc pl-5 mb-6 text-gray-600">
              {pieces.map((piece, index) => (
                <li key={index} className="flex justify-between items-center mb-2">
                  <span>{piece.width} x {piece.height} {unit}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePiece(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>

            <div className="flex space-x-4">
              <Button onClick={calculateCuts} className="flex-1">Calculate Cuts</Button>
              <Button onClick={reset} variant="outline" className="flex-1">Reset</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cut Layout</CardTitle>
          </CardHeader>
          <CardContent>
            {cuts.length > 0 ? (
              Array.from(new Set(cuts.map(cut => cut.sheet))).map(sheetIndex => renderSheet(sheetIndex))
            ) : (
              <div className="text-gray-500 text-center">No cuts calculated yet.</div>
            )}

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <h2 className="text-xl font-semibold mb-4 text-gray-700">Cut Instructions</h2>
            <ol className="list-decimal pl-5 text-gray-600">
              {cuts.map((cut, index) => (
                <li key={index} className="mb-2">
                  <span className="font-semibold">{cut.label}:</span> Cut a {cut.width} x {cut.height} {unit} piece at position ({cut.x}, {cut.y}) on sheet {cut.sheet + 1}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdvancedSheetCutter