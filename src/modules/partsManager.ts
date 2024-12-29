export default function partsManager(target: string) {
  console.log(target);
  const parts: string[] = [];
  if (parts.includes(target))
    parts.splice(parts.indexOf(target))
  else
    parts.push(target);

  console.log(parts);
}
