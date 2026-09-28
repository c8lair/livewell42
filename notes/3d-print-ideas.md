# 3D Print Ideas

Saved from conversation on 2026-09-28.

## Local monitoring instead of burning GrokBot credits
- Keep GrokBot for planning/thinking.
- Run a local vision model for constant camera watching of prints.
- DeepSeek VL models are heavy; prefer Qwen3-VL 8B via Ollama (~8GB VRAM).
- Purpose-built detectors: PrintGuard (open source, Docker/desktop, pauses printer, alerts), Obico self-hosted (free, Raspberry Pi friendly), or Bambu AI Monitor (Home Assistant + YOLOv8).
- These can auto-pause on sustained defects (spaghetti, failed layers) with no cloud/API cost.
- Wiring: local watcher guards the build; GrokBot decides what/when to print.

## Next steps (when ready)
- Sketch wiring between GrokBot and local watcher.
- Evaluate PrintGuard vs Obico vs Qwen3-VL script for the printer.
