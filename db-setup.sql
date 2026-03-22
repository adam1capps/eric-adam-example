-- ============================================
-- RoofView Demo Co — Neon Database Setup
-- Run this in your Neon SQL Editor
-- ============================================

-- Create the projects table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255) NOT NULL,
    roof_type VARCHAR(100) NOT NULL,        -- e.g., 'Flat', 'Low-Slope', 'Metal Standing Seam'
    membrane VARCHAR(100) NOT NULL,          -- e.g., 'TPO', 'EPDM', 'PVC', 'Modified Bitumen'
    square_footage DECIMAL(10,2) NOT NULL,   -- Actual roof SF being modeled
    scale_ratio VARCHAR(20) NOT NULL,        -- e.g., '1:24', '1:48', '1:12'
    status VARCHAR(50) DEFAULT 'inquiry',    -- inquiry, approved, in_progress, completed, delivered
    price DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_name);

-- Seed with demo data
INSERT INTO projects (project_name, client_name, client_email, roof_type, membrane, square_footage, scale_ratio, status, price, notes) VALUES
('Vanderbilt Medical Tower - Training Model', 'Vanderbilt University', 'facilities@vumc.org', 'Flat', 'TPO', 45000.00, '1:48', 'completed', 8500.00, 'Full cutaway model showing insulation layers, drainage, and membrane detail. Used for facilities team training.'),
('Amazon Fulfillment Center - Warranty Demo', 'Amazon Logistics', 'roofops@amazon.com', 'Low-Slope', 'EPDM', 320000.00, '1:96', 'in_progress', 12000.00, 'Large-scale warehouse model. Client wants to visualize warranty coverage zones and drainage patterns.'),
('Pinnacle Tower - Investor Presentation', 'Highwoods Properties', 'jmartin@highwoods.com', 'Flat', 'PVC', 28000.00, '1:24', 'approved', 6200.00, 'High-detail model for board presentation. Needs working drainage demo with colored water flow.'),
('Bridgestone HQ - Moisture Mapping', 'Bridgestone Americas', 'mfacilities@bridgestone.com', 'Flat', 'Modified Bitumen', 67000.00, '1:48', 'inquiry', NULL, 'Exploring a model that shows moisture intrusion paths. Want to pair with infrared scan overlay.'),
('Nissan Stadium Press Box', 'Tennessee Titans', 'ops@titans.nfl.com', 'Metal Standing Seam', 'Metal', 15000.00, '1:24', 'completed', 4800.00, 'Detailed press box roof section showing panel seams, fasteners, and snow guard placement.'),
('HCA Healthcare Campus - Phase 1', 'HCA Healthcare', 'rjones@hcahealthcare.com', 'Flat', 'TPO', 185000.00, '1:96', 'in_progress', 15500.00, 'Multi-building campus model. Phase 1 covers main hospital and parking structure roofs.'),
('Gaylord Opryland - Convention Wing', 'Ryman Hospitality', 'engineering@gaylordhotels.com', 'Low-Slope', 'PVC', 92000.00, '1:48', 'approved', 9800.00, 'Convention center wing with skylight cutouts. Model needs removable sections to show assembly layers.'),
('Dollar General Distribution Center', 'Dollar General Corp', 'facilities@dollargeneral.com', 'Low-Slope', 'TPO', 410000.00, '1:96', 'inquiry', NULL, 'Preliminary inquiry for distribution hub roof model. Interested in showing re-cover vs tear-off options.');
