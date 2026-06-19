export interface TemplateCfg {
  id: string;
  name: string;
  type: 'graph' | 'hypergraph' | 'list' | 'set' | 'model' | 'temporal_graph' | 'spatial_graph' | 'spatio_temporal_graph';
  language: string[];
  description_zh: string;
  description_en: string;
  tags: string[];
}

export interface ServiceConfig {
  provider: string;
  model: string;
  api_key: string;
  base_url: string;
}

export interface AppConfig {
  llm: ServiceConfig;
  embedder: ServiceConfig;
  agent: ServiceConfig;
}

export interface KARecord {
  path: string;
  name: string;
  template: string;
  lang: string;
  node_count: number;
  edge_count: number;
  has_index: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface TaskRecord {
  id: string;
  type: 'parse' | 'feed' | 'build-index';
  status: 'running' | 'success' | 'failed';
  progress: string;
  phase?: string;
  chunks_completed?: number;
  chunks_total?: number;
  elapsed_seconds?: number;
  logs: string[];
  started_at: string;
  completed_at: string | null;
  output_path: string;
  template?: string;
  partial_data?: any;
}

export interface GraphNode {
  id: string;
  name: string;
  type: string;
  description?: string;
  // Spatial/Temporal fields
  time?: string | number;
  location?: string;
  coordinates?: [number, number];
  // Canvas simulation properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  source: string; // node ID or object
  target: string; // node ID or object
  type: string;
  description?: string;
  time?: string | number;
  location?: string;
}

export interface KAData {
  path: string;
  name: string;
  data: {
    nodes?: any[];
    edges?: any[];
    items?: any[];
    [key: string]: any;
  };
  metadata: {
    template: string;
    lang: string;
    created_at?: string;
    updated_at?: string;
    [key: string]: any;
  } | null;
  has_index: boolean;
}
