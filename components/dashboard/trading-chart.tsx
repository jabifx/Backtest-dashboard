"use client"

import { useEffect, useRef } from "react"

interface ChartData {
  time: number // UNIX timestamp en segundos
  open?: number
  high?: number
  low?: number
  close?: number
  value?: number
}

interface Signal {
  time: number
  text?: string
}

interface TradingChartProps {
  data: ChartData[]
  type?: "candlestick" | "line"
}

export function TradingChart({ data, type = "candlestick" }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const seriesRef = useRef<any>(null)

  // Filtrar fines de semana (sábado=6, domingo=0)
  const filterWeekends = (data: ChartData[]) => {
    return data.filter((candle) => {
      const date = new Date(candle.time * 1000)
      const day = date.getDay()
      return day !== 0 && day !== 6
    })
  }

  const setTradeMarkers = (entries: Signal[], exits: Signal[]) => {
    if (!seriesRef.current) return

    try {
      // Validar y convertir timestamps
      const validateAndConvertTime = (signal: Signal) => {
        let time = signal.time

        // Si es timestamp en milisegundos, convertir a segundos
        if (time > 1e10) {
          time = Math.floor(time / 1000)
        }

        return time
      }

      const validEntries = entries
          .filter((e) => e && e.time)
          .map((e) => ({
            ...e,
            time: validateAndConvertTime(e),
          }))

      const validExits = exits
          .filter((e) => e && e.time)
          .map((e) => ({
            ...e,
            time: validateAndConvertTime(e),
          }))

      const markers = [
        ...validEntries.map((e) => ({
          time: e.time,
          position: "belowBar" as const,
          color: "#22c55e",
          shape: "arrowUp" as const,
          text: e.text || "Entry",
          size: 1,
        })),
        ...validExits.map((e) => ({
          time: e.time,
          position: "aboveBar" as const,
          color: "#ef4444",
          shape: "arrowDown" as const,
          text: e.text || "Exit",
          size: 1,
        })),
      ]

      seriesRef.current.setMarkers(markers)
    } catch (error) {
      console.error("Error setting markers:", error)
    }
  }

  useEffect(() => {
    if (!chartContainerRef.current) return

    let cleanup: (() => void) | null = null

    import("lightweight-charts").then((LightweightCharts) => {
      if (!chartContainerRef.current || chartRef.current) return

      const chart = LightweightCharts.createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 300,
        layout: {
          background: { color: "#FFFFFF" },
          textColor: "black",
        },
        grid: {
          vertLines: { visible: false, color: "gray" },
          horzLines: { visible: false, color: "gray" },
        },
        timeScale: {
          borderColor: "gray",
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: {
          borderColor: "gray",
        },
        crosshair: {
          mode: 1 as any,
        },
      })

      chartRef.current = chart

      if (type === "candlestick") {
        seriesRef.current = chart.addSeries(LightweightCharts.CandlestickSeries, {
          upColor: "#66BB6A",
          downColor: "#000000",
          borderVisible: false,
          wickUpColor: "#66BB6A",
          wickDownColor: "#000000",
        })
        console.log("✅ Serie candlestick creada:", seriesRef.current)
      } else {
        seriesRef.current = chart.addSeries(LightweightCharts.AreaSeries, {
          lineColor: "#2962FF",
          topColor: "rgba(41, 98, 255, 0.1)",
          bottomColor: "rgba(41, 98, 255, 0)",
          lineWidth: 2,
        })
      }

      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          })
        }
      }

      window.addEventListener("resize", handleResize)

      cleanup = () => {
        window.removeEventListener("resize", handleResize)
        if (chartRef.current) {
          chartRef.current.remove()
          chartRef.current = null
          seriesRef.current = null
        }
      }
    })

    return () => {
      if (cleanup) cleanup()
    }
  }, [type])

  useEffect(() => {
    if (!seriesRef.current || !data || data.length === 0) return

    try {
      const filteredData = filterWeekends(data)

      if (type === "candlestick") {
        const validData = filteredData.filter(
            (d) =>
                d.open !== undefined &&
                d.high !== undefined &&
                d.low !== undefined &&
                d.close !== undefined &&
                !isNaN(d.open) &&
                !isNaN(d.high) &&
                !isNaN(d.low) &&
                !isNaN(d.close),
        )

        if (validData.length > 0) {
          seriesRef.current.setData(validData)

          setTimeout(() => {
            if (chartRef.current) {
              chartRef.current.timeScale().scrollToRealTime()
            }
          }, 100)
        }
      } else {
        const lineData = filteredData
            .filter((d) => d.value !== undefined && !isNaN(d.value))
            .map((d) => ({ time: d.time, value: d.value! }))

        if (lineData.length > 0) {
          seriesRef.current.setData(lineData)

          setTimeout(() => {
            if (chartRef.current) {
              chartRef.current.timeScale().scrollToRealTime()
            }
          }, 100)
        }
      }
    } catch (error) {
      console.error("Error updating chart:", error)
    }
  }, [data, type])


  return (
      <div>
        <div ref={chartContainerRef} className="w-full h-[300px] rounded border" style={{ minHeight: "300px" }} />
      </div>
  )
}
