package core

import (
	"fmt"
	"os/exec"
)

func StartWarp() {
	fmt.Println("🌀 اتصال به Warp...")
	cmd := exec.Command("warp-cli", "connect")
	output, err := cmd.CombinedOutput()
	if err != nil {
		fmt.Println("خطا در warp-cli:", err)
	}
	fmt.Println(string(output))
}
