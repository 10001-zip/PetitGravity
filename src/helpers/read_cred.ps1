$code = @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class CredManager {
    [DllImport("advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CredReadW(string target, uint type, int reserved, out IntPtr credentialPtr);

    [DllImport("advapi32.dll", EntryPoint = "CredFree", SetLastError = true)]
    private static extern void CredFree(IntPtr credentialPtr);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct CREDENTIAL {
        public uint flags;
        public uint type;
        public string targetName;
        public string comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME lastWritten;
        public uint credentialBlobSize;
        public IntPtr credentialBlob;
        public uint persist;
        public uint attributeCount;
        public IntPtr attributes;
        public string targetAlias;
        public string userName;
    }

    public static string ReadCredential(string target) {
        IntPtr credPtr;
        if (CredReadW(target, 1, 0, out credPtr)) {
            try {
                CREDENTIAL cred = (CREDENTIAL)Marshal.PtrToStructure(credPtr, typeof(CREDENTIAL));
                byte[] blob = new byte[cred.credentialBlobSize];
                Marshal.Copy(cred.credentialBlob, blob, 0, blob.Length);
                return Encoding.UTF8.GetString(blob);
            } finally {
                CredFree(credPtr);
            }
        }
        return null;
    }
}
"@

if (-not ([System.Management.Automation.PSTypeName]"CredManager").Type) {
    Add-Type -TypeDefinition $code
}

$res = [CredManager]::ReadCredential("gemini:antigravity")
if ($res) {
    Write-Output $res
} else {
    Write-Output "not_found"
}
