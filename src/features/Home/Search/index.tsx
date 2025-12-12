import { onCleanup } from "solid-js";
import './Search.css';
import Results from './Results';
import Input from "./Input";
import { resetSearch } from "@lib/stores";
import Filters from "./Filters";



export default function() {


  onCleanup(resetSearch);


  return (
    <div class="search">
      <form class="superInputContainer">
        <Input />
        <Filters />
      </form>
      <Results />
    </div>
  );
}
