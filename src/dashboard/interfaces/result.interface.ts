// Define the structure of the GovDataResult data
export interface GovDataResult {
  help: string;
  success: boolean;
  result: {
    count: number;
    facets: any;
    results: Array<any>;
  };
}
