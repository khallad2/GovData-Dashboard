// Define the structure of the departments.json data
interface Department {
  name: string;
  subordinates?: { name: string }[];
}
