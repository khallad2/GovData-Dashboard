// Define the structure of the departments.json data
export interface Department {
  name: string;
  subordinates?: Department[];
}
