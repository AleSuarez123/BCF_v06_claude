
export class ImageEditor {
    constructor(canvas, imageSrc, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.image = new Image();
        this.image.crossOrigin = "Anonymous";
        this.image.src = imageSrc;
        
        this.shapes = [];
        this.currentTool = 'draw'; // draw, line, rect, circle, text, move
        this.currentColor = '#ff0000';
        this.currentLineWidth = 3;
        this.currentFontSize = 20;
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.selectedShape = null;
        
        // History for undo
        this.history = [];
        
        this.image.onload = () => {
            this.resizeCanvas();
            this.render();
        };

        this.bindEvents();
    }

    resizeCanvas() {
        const parent = this.canvas.parentElement;
        const rect = parent.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Calculate scale to fit image
        const scale = Math.min(
            this.canvas.width / this.image.width,
            this.canvas.height / this.image.height
        );
        this.scale = scale;
        this.offsetX = (this.canvas.width - this.image.width * scale) / 2;
        this.offsetY = (this.canvas.height - this.image.height * scale) / 2;
        
        this.render();
    }

    bindEvents() {
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left),
            y: (e.clientY - rect.top)
        };
    }

    onMouseDown(e) {
        const pos = this.getMousePos(e);
        this.startX = pos.x;
        this.startY = pos.y;
        this.isDrawing = true;

        if (this.currentTool === 'move') {
            // Find shape under cursor (reverse to find top-most)
            this.selectedShape = null;
            for (let i = this.shapes.length - 1; i >= 0; i--) {
                if (this.hitTest(this.shapes[i], pos.x, pos.y)) {
                    this.selectedShape = this.shapes[i];
                    this.dragOffsetX = pos.x - this.shapes[i].x;
                    this.dragOffsetY = pos.y - this.shapes[i].y;
                    break;
                }
            }
        } else if (this.currentTool === 'text') {
            const text = prompt('Ingrese texto:', '');
            if (text) {
                this.addShape({
                    type: 'text',
                    x: pos.x,
                    y: pos.y,
                    text: text,
                    color: this.currentColor,
                    size: this.currentFontSize
                });
            }
            this.isDrawing = false;
        } else if (this.currentTool === 'draw') {
             this.currentPath = [{x: pos.x, y: pos.y}];
        }
    }

    onMouseMove(e) {
        if (!this.isDrawing) return;
        const pos = this.getMousePos(e);

        if (this.currentTool === 'move' && this.selectedShape) {
            this.selectedShape.x = pos.x - this.dragOffsetX;
            this.selectedShape.y = pos.y - this.dragOffsetY;
            this.render();
        } else if (this.currentTool === 'draw') {
            this.currentPath.push({x: pos.x, y: pos.y});
            this.render();
            // Draw current path preview
            this.ctx.beginPath();
            this.ctx.moveTo(this.currentPath[0].x, this.currentPath[0].y);
            for (let p of this.currentPath) this.ctx.lineTo(p.x, p.y);
            this.ctx.strokeStyle = this.currentColor;
            this.ctx.lineWidth = this.currentLineWidth;
            this.ctx.stroke();
        } else {
            this.render();
            // Draw preview shape
            this.drawShapePreview(this.currentTool, this.startX, this.startY, pos.x, pos.y);
        }
    }

    onMouseUp(e) {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        const pos = this.getMousePos(e);

        if (this.currentTool === 'move') {
            this.selectedShape = null;
        } else if (this.currentTool === 'draw') {
            if (this.currentPath && this.currentPath.length > 1) {
                this.addShape({
                    type: 'path',
                    points: this.currentPath,
                    color: this.currentColor,
                    width: this.currentLineWidth
                });
            }
        } else if (this.currentTool !== 'text') { // Text is handled in mousedown
             // Avoid tiny shapes
            if (Math.abs(pos.x - this.startX) > 5 || Math.abs(pos.y - this.startY) > 5) {
                this.addShape({
                    type: this.currentTool,
                    x: this.startX,
                    y: this.startY,
                    w: pos.x - this.startX,
                    h: pos.y - this.startY,
                    color: this.currentColor,
                    width: this.currentLineWidth
                });
            }
        }
        this.render();
    }

    addShape(shape) {
        this.history.push([...this.shapes]); // Simple undo (copy array)
        this.shapes.push(shape);
        this.render();
    }

    undo() {
        if (this.history.length > 0) {
            this.shapes = this.history.pop();
            this.render();
        }
    }

    hitTest(shape, x, y) {
        if (shape.type === 'rect') {
            return x >= shape.x && x <= shape.x + shape.w && y >= shape.y && y <= shape.y + shape.h;
        } else if (shape.type === 'circle') {
            const radius = Math.sqrt(shape.w * shape.w + shape.h * shape.h);
            const dx = x - shape.x;
            const dy = y - shape.y;
            return Math.sqrt(dx*dx + dy*dy) <= radius;
        } else if (shape.type === 'text') {
             // Simple approx
             return x >= shape.x && x <= shape.x + 100 && y >= shape.y - 20 && y <= shape.y;
        }
        return false;
    }

    drawShapePreview(type, x1, y1, x2, y2) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.currentLineWidth;
        
        if (type === 'rect') {
            this.ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        } else if (type === 'circle') {
            const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            this.ctx.arc(x1, y1, radius, 0, 2 * Math.PI);
            this.ctx.stroke();
        } else if (type === 'line') {
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }
    }

    render() {
        // Clear
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw Image
        if (this.image.complete) {
            this.ctx.drawImage(this.image, this.offsetX, this.offsetY, this.image.width * this.scale, this.image.height * this.scale);
        }

        // Draw Shapes
        this.shapes.forEach(shape => {
            this.ctx.beginPath();
            this.ctx.strokeStyle = shape.color;
            this.ctx.lineWidth = shape.width || 2;
            this.ctx.fillStyle = shape.color;

            if (shape.type === 'rect') {
                this.ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
            } else if (shape.type === 'circle') {
                const radius = Math.sqrt(Math.pow(shape.w, 2) + Math.pow(shape.h, 2));
                this.ctx.arc(shape.x, shape.y, radius, 0, 2 * Math.PI);
                this.ctx.stroke();
            } else if (shape.type === 'line') {
                this.ctx.moveTo(shape.x, shape.y);
                this.ctx.lineTo(shape.x + shape.w, shape.y + shape.h);
                this.ctx.stroke();
            } else if (shape.type === 'path') {
                if (shape.points.length > 0) {
                    this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
                    for (let p of shape.points) this.ctx.lineTo(p.x, p.y);
                    this.ctx.stroke();
                }
            } else if (shape.type === 'text') {
                this.ctx.font = `${shape.size}px Arial`;
                this.ctx.fillText(shape.text, shape.x, shape.y);
            }
        });
    }

    save() {
        return this.canvas.toDataURL('image/png');
    }

    setTool(tool) { this.currentTool = tool; }
    setColor(color) { this.currentColor = color; }
    setLineWidth(width) { this.currentLineWidth = width; }
    setFontSize(size) { this.currentFontSize = size; }
}
