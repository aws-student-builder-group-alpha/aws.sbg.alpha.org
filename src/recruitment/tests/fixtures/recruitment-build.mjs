import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
// Dynamic routes have no prerendered HTML. Use their real production CSS manifest.
export async function recruitmentStyleShell() {
 const filename=new URL('../../../../.next/server/app/(recruitment)/recruitment/admin/page_client-reference-manifest.js',import.meta.url);
 const context={};
 vm.runInNewContext(await readFile(filename,'utf8'),context,{filename:fileURLToPath(filename)});
 const route=Object.values(context.__RSC_MANIFEST)[0];
 const styles=[...new Set(Object.values(route.entryCSSFiles).flat().map(item=>item.path))];
 if(!styles.length)throw Error('Build the unified app before running recruitment browser fixtures.');
 return styles.map(path=>`<link rel="stylesheet" href="/_next/${path}">`).join('');
}
