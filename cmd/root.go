package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "fg-cli",
	Short: "گارد آزادی - ابزار CLI برای اتصال به VPN",
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println("خطا:", err)
		os.Exit(1)
	}
}
