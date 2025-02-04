'use client'

import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import dynamic from 'next/dynamic'
import { useCallback, useRef, useState } from 'react'
const generateEmptyGrid = () => {
  const grid = []
  for (let z = 0; z < gridSize; z++) {
    const layer = []
    for (let y = 0; y < gridSize; y++) {
      const row = []
      for (let x = 0; x < gridSize; x++) {
        row.push(0)
      }
      layer.push(row)
    }
    grid.push(layer)
  }
  return grid
}

// ランダムな状態の3Dグリッドを作成する関数
const generateRandomGrid = () => {
  const grid = []
  for (let z = 0; z < gridSize; z++) {
    const layer = []
    for (let y = 0; y < gridSize; y++) {
      const row = []
      for (let x = 0; x < gridSize; x++) {
        // 生存確率は20%（好みで調整してな）
        row.push(Math.random() > 0.8 ? 1 : 0)
      }
      layer.push(row)
    }
    grid.push(layer)
  }
  return grid
}

// 3Dの場合、各セルの隣接は26方向（中心以外の3×3×3の全セル）になるで
const neighborOffsets = []
for (let dz = -1; dz <= 1; dz++) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0 && dz === 0) continue
      neighborOffsets.push([dx, dy, dz])
    }
  }
}

// 各セルをBox（立方体）で描画するコンポーネント
const Cell = ({ x, y, z, alive, toggleCell }) => {
  return (
    <mesh
      position={[x * cellSpacing, y * cellSpacing, z * cellSpacing]}
      onClick={(e) => {
        // クリックイベントが親に伝わらんように
        e.stopPropagation()
        toggleCell(x, y, z)
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={alive ? 'hotpink' : 'lightgrey'} />
    </mesh>
  )
}

// グリッドのサイズやセル間の間隔を定義
const gridSize = 10
const cellSpacing = 1.2 // セル間の距離
const Logo = dynamic(() => import('@/components/canvas/Examples').then((mod) => mod.Logo), { ssr: false })
const Dog = dynamic(() => import('@/components/canvas/Examples').then((mod) => mod.Dog), { ssr: false })
const Duck = dynamic(() => import('@/components/canvas/Examples').then((mod) => mod.Duck), { ssr: false })
const View = dynamic(() => import('@/components/canvas/View').then((mod) => mod.View), {
  ssr: false,
  loading: () => (
    <div className='flex h-96 w-full flex-col items-center justify-center'>
      <svg className='-ml-1 mr-3 h-5 w-5 animate-spin text-black' fill='none' viewBox='0 0 24 24'>
        <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
        <path
          className='opacity-75'
          fill='currentColor'
          d='M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
        />
      </svg>
    </div>
  ),
})
const Common = dynamic(() => import('@/components/canvas/View').then((mod) => mod.Common), { ssr: false })

export default function Page() {
  // 3Dグリッドの状態を管理する
  const [grid, setGrid] = useState(generateEmptyGrid)
  // シミュレーション実行中のフラグ
  const [running, setRunning] = useState(false)
  const runningRef = useRef(running)
  runningRef.current = running

  // シミュレーションを実行する関数
  const runSimulation = useCallback(() => {
    if (!runningRef.current) return
    setGrid((oldGrid) => {
      // 新しいグリッドを作る
      const newGrid = oldGrid.map((layer, z) =>
        layer.map((row, y) =>
          row.map((cell, x) => {
            let neighbors = 0
            // 26近傍のセルの状態をカウント
            neighborOffsets.forEach(([dx, dy, dz]) => {
              const newX = x + dx
              const newY = y + dy
              const newZ = z + dz
              if (newX >= 0 && newX < gridSize && newY >= 0 && newY < gridSize && newZ >= 0 && newZ < gridSize) {
                neighbors += oldGrid[newZ][newY][newX]
              }
            })
            // 3D版ライフゲームのルールは色々あるが、ここでは一例として
            // 生存: 生きてるセルは隣接が5個または6個なら生存、それ以外は死滅
            // 誕生: 死んでるセルは隣接がちょうど5個なら誕生
            if (cell === 1) {
              return neighbors === 5 || neighbors === 6 ? 1 : 0
            } else {
              return neighbors === 5 ? 1 : 0
            }
          }),
        ),
      )
      return newGrid
    })
    setTimeout(runSimulation, 500)
  }, [])

  // セルのオン／オフを切り替える関数
  const toggleCell = (x, y, z) => {
    setGrid((oldGrid) => {
      const newGrid = JSON.parse(JSON.stringify(oldGrid))
      newGrid[z][y][x] = oldGrid[z][y][x] ? 0 : 1
      return newGrid
    })
  }

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      {/* 操作用のボタン類 */}
      <div style={{ position: 'absolute', zIndex: 1, padding: '10px' }}>
        <button
          onClick={() => {
            setRunning(!running)
            if (!running) {
              runningRef.current = true
              runSimulation()
            }
          }}
          style={{ marginRight: '10px' }}
        >
          {running ? '停止' : 'スタート'}
        </button>
        <button
          onClick={() => {
            setGrid(generateEmptyGrid())
          }}
          style={{ marginRight: '10px' }}
        >
          リセット
        </button>
        <button
          onClick={() => {
            setGrid(generateRandomGrid())
          }}
        >
          ランダム
        </button>
      </div>

      {/* react-three-fiber の Canvas で3Dシーンを構築 */}
      <Canvas camera={{ position: [gridSize, gridSize, gridSize] }}>
        {/* 環境光と点光源を設定 */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        {/* カメラ操作用のOrbitControls */}
        <OrbitControls />
        {/* 各セルをレンダリング */}
        {grid.map((layer, z) =>
          layer.map((row, y) =>
            row.map((cell, x) => (
              <Cell key={`${x}-${y}-${z}`} x={x} y={y} z={z} alive={cell} toggleCell={toggleCell} />
            )),
          ),
        )}
      </Canvas>
    </div>
  )
}
